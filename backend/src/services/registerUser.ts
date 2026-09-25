import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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
  | { status: 'created'; user: { uid: string; email: string | null; role: 'PARTICIPANT'; profile?: RegisterProfileData } };

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
  const userRef = db.collection('users').doc(uid);

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
    const docData: Record<string, any> = {
      uid,
      email: email ?? existingData.email ?? null,
      role: 'PARTICIPANT',
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

    return false;
  });

  if (alreadyRegistered) {
    return { status: 'already-registered' };
  }

  return { status: 'created', user: { uid, email, role: 'PARTICIPANT', profile: profileData } };
}
