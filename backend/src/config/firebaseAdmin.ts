import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import * as fs from 'fs';
import * as path from 'path';

// Inicializa o Firebase Admin SDK como Singleton
if (admin.apps.length === 0) {
  let initialized = false;
  const rawEnvJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const candidatePaths = [
    path.resolve(__dirname, '../../service-account.json'),
    path.resolve(process.cwd(), 'service-account.json')
  ];

  try {
    if (rawEnvJson && rawEnvJson.trim().startsWith('{')) {
      const certObj = JSON.parse(rawEnvJson);
      if (typeof admin.credential?.cert === 'function') {
        admin.initializeApp({ credential: admin.credential.cert(certObj) });
        initialized = true;
      }
    } else {
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const certObj = JSON.parse(fs.readFileSync(p, 'utf8'));
          if (typeof admin.credential?.cert === 'function') {
            admin.initializeApp({ credential: admin.credential.cert(certObj) });
            initialized = true;
            break;
          }
        }
      }
    }
  } catch {
    // Fallback silencioso para inicialização padrão caso o JSON não seja válido
  }

  if (!initialized) {
    admin.initializeApp();
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export { FieldValue };
export default admin;
