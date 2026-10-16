import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { UserRole } from '../types/express';
import { isValidFirestoreId } from '../lib/firestoreId';

export interface RegisterProfileData {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  phone?: string;
  participantType?: string;
  course?: string;
  period?: string;
  linkedin?: string;
  instagram?: string;
  photoURL?: string;
}

export type RegisterUserResult =
  | { status: 'already-registered' }
  | { status: 'created'; user: { uid: string; email: string | null; role: UserRole; profile?: RegisterProfileData } };

/**
 * Grava o perfil do usuário em /users/{uid} dentro de uma transação, garantindo que
 * o documento só é criado uma vez (idempotência) e sempre com `termsAcceptedAt`
 * preenchido — ver REG-LGPD-001 / KAN-72.
 *
 * Extraído do handler HTTP (routes/auth.ts) pra poder ser testado isoladamente,
 * sem precisar inicializar o Firebase Admin SDK de verdade nem passar por Express.
 */
export async function registerUser(
  db: admin.firestore.Firestore,
  uid: string,
  email: string | null,
  profileData?: RegisterProfileData
): Promise<RegisterUserResult> {
  if (!isValidFirestoreId(uid)) {
    throw new Error('Identificador de usuário (uid) inválido para o Firestore.');
  }

  const userRef = db.collection('users').doc(uid);
  const publicProfileRef = db.collection('public_profiles').doc(uid);

  let userRole: UserRole = 'PARTICIPANT';

  const alreadyRegistered = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(userRef);

    if (snapshot.exists && snapshot.data()?.termsAcceptedAt) {
      return true;
    }

    const existingData = snapshot.data() || {};
    const now = typeof FieldValue?.serverTimestamp === 'function'
      ? FieldValue.serverTimestamp()
      : (typeof admin.firestore?.FieldValue?.serverTimestamp === 'function'
          ? admin.firestore.FieldValue.serverTimestamp()
          : new Date().toISOString());

    userRole = existingData.role || 'PARTICIPANT';

    const docData: Record<string, any> = {
      uid,
      email: email ?? existingData.email ?? null,
      role: userRole,
      totalPoints: existingData.totalPoints ?? 0,
      pontuacaoTotal: existingData.pontuacaoTotal ?? existingData.totalPoints ?? 0,
      termsAcceptedAt: now,
      createdAt: existingData.createdAt || now
    };

    if (profileData) {
      if (profileData.firstName) docData.firstName = profileData.firstName;
      if (profileData.lastName) docData.lastName = profileData.lastName;
      if (profileData.displayName) {
        docData.displayName = profileData.displayName;
      } else if (profileData.firstName && profileData.lastName) {
        docData.displayName = `${profileData.firstName} ${profileData.lastName}`.trim();
      }
      if (profileData.username) docData.username = profileData.username;
      if (profileData.phone) docData.phone = profileData.phone;
      if (profileData.participantType) docData.participantType = profileData.participantType;
      if (profileData.course) docData.course = profileData.course;
      if (profileData.period) docData.period = profileData.period;
      if (profileData.linkedin) docData.linkedin = profileData.linkedin;
      if (profileData.instagram) docData.instagram = profileData.instagram;
      if (profileData.photoURL) docData.photoURL = profileData.photoURL;
    }

    tx.set(userRef, docData, { merge: true });

    // Sincroniza documento público em /public_profiles/{uid} (KAN-137)
    // NUNCA incluir email, phone nem termsAcceptedAt
    const publicProfileData: Record<string, any> = {
      uid,
      role: userRole,
      totalPoints: docData.totalPoints,
      pontuacaoTotal: docData.pontuacaoTotal,
      createdAt: docData.createdAt
    };
    if (docData.firstName) publicProfileData.firstName = docData.firstName;
    if (docData.lastName) publicProfileData.lastName = docData.lastName;
    if (docData.displayName) publicProfileData.displayName = docData.displayName;
    if (docData.username) publicProfileData.username = docData.username;
    if (docData.participantType) publicProfileData.participantType = docData.participantType;
    if (docData.course) publicProfileData.course = docData.course;
    if (docData.period) publicProfileData.period = docData.period;
    if (docData.linkedin) publicProfileData.linkedin = docData.linkedin;
    if (docData.instagram) publicProfileData.instagram = docData.instagram;
    if (docData.photoURL) publicProfileData.photoURL = docData.photoURL;

    tx.set(publicProfileRef, publicProfileData, { merge: true });

    return false;
  });

  if (alreadyRegistered) {
    return { status: 'already-registered' };
  }

  return { status: 'created', user: { uid, email, role: userRole, profile: profileData } };
}
