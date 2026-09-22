import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyFakeKeyForTestAndCIEnvironment123',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'facom-techweek-layerx.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'facom-techweek-layerx',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'facom-techweek-layerx.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456'
};

// Inicializa a instância do Firebase
const app = initializeApp(firebaseConfig);

// Instâncias dos serviços
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Conecta automaticamente aos emuladores locais se a flag USE_EMULATORS estiver ativa ou no modo DEV explícito
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    console.log('⚡ Conectado aos Emuladores do Firebase (Auth, Firestore, Storage)');
  } catch (err) {
    console.warn('⚠️ Erro ao conectar nos emuladores locais do Firebase:', err);
  }
}

export default app;

