import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Inicializa o Firebase Admin SDK como Singleton
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export { FieldValue };
export default admin;
