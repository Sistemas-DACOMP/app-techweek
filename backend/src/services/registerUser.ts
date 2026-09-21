import * as admin from 'firebase-admin';

export type RegisterUserResult =
  | { status: 'already-registered' }
  | { status: 'created'; user: { uid: string; email: string | null; role: 'PARTICIPANT' } };

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
  email: string | null
): Promise<RegisterUserResult> {
  const userRef = db.collection('users').doc(uid);

  const alreadyRegistered = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(userRef);

    if (snapshot.exists) {
      return true;
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    tx.set(userRef, {
      uid,
      email,
      role: 'PARTICIPANT',
      termsAcceptedAt: now,
      createdAt: now
    });

    return false;
  });

  if (alreadyRegistered) {
    return { status: 'already-registered' };
  }

  return { status: 'created', user: { uid, email, role: 'PARTICIPANT' } };
}
