/** @license SPDX-License-Identifier: Apache-2.0 */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
export interface FirebaseServices {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly googleProvider: GoogleAuthProvider;
  readonly isEmulator: true;
}
let initialization: Promise<FirebaseServices> | undefined;
function localEndpoint(value: string): URL {
  const endpoint = new URL('http://' + value);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) || endpoint.username || endpoint.password || endpoint.pathname !== '/' || endpoint.search || endpoint.hash || !endpoint.port) {
    throw new Error('ローカルエミュレーターの接続設定を確認してください。');
  }
  return endpoint;
}
// Expose the SDK capability only after both emulator routes and persistence are ready.
export function initFirebase(): Promise<FirebaseServices> {
  if (initialization) return initialization;
  initialization = (async () => {
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR !== 'true') {
      throw new Error('エミュレーターモードを明示してください。実Firebase接続は無効です。');
    }
    const authEndpoint = localEndpoint(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099');
    const storeEndpoint = localEndpoint((import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1') + ':' + (import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '18080'));
    if (getApps().length) throw new Error('既存Firebase Appは再利用しません。ページを再読み込みしてください。');
    const app = initializeApp({ apiKey: 'fake-api-key-for-emulator', projectId: 'demo-themedialogueai', authDomain: 'demo-themedialogueai.firebaseapp.com' });
    const auth = getAuth(app);
    const db = getFirestore(app);
    connectAuthEmulator(auth, authEndpoint.origin, { disableWarnings: true });
    connectFirestoreEmulator(db, storeEndpoint.hostname, Number(storeEndpoint.port));
    await setPersistence(auth, browserSessionPersistence);
    return { app, auth, db, googleProvider: new GoogleAuthProvider(), isEmulator: true };
  })();
  return initialization;
}
