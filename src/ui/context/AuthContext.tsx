/** @license SPDX-License-Identifier: Apache-2.0 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppState } from '../../core/models/AppState';
import { AuthWrapper } from '../../wrapper/AuthWrapper';
import { FirebaseAuthAdapter } from '../../wrapper/adapters/FirebaseAuthAdapter';
import { FirestoreUserRepository } from '../../wrapper/adapters/FirestoreUserRepository';
import { initFirebase } from '../../wrapper/config/firebase';

interface AuthContextValue {
  readonly state: AppState;
  readonly signIn: () => Promise<void>;
  readonly signOut: () => Promise<void>;
  readonly retry: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [wrapper, setWrapper] = useState<AuthWrapper | null>(null);
  const [state, setState] = useState<AppState>({ status: 'restoring', identity: null, user: null, errorMessage: null, generation: 0 });
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    void initFirebase().then(services => {
      if (cancelled) return;
      const ready = new AuthWrapper(new FirebaseAuthAdapter(services.auth, services.googleProvider), new FirestoreUserRepository(services.db));
      const unsubscribe = ready.subscribe(setState);
      ready.start();
      setWrapper(ready);
      cleanup = () => { unsubscribe(); ready.stop(); };
    }).catch(() => {
      if (!cancelled) setState({ status: 'error', identity: null, user: null, errorMessage: '起動に失敗しました。エミュレーター設定を確認して再読み込みしてください。', generation: 0 });
    });
    return () => { cancelled = true; cleanup(); };
  }, []);
  return <AuthContext.Provider value={{
    state, signIn: () => wrapper?.signInWithGoogle() || Promise.resolve(),
    signOut: () => wrapper?.signOut() || Promise.resolve(),
    retry: () => wrapper?.retryEnsureUser() || Promise.resolve(),
  }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProviderが必要です。');
  return value;
}
