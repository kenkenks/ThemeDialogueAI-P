/** @license SPDX-License-Identifier: Apache-2.0 */
import { signInWithPopup, signOut, onAuthStateChanged, type Auth, type GoogleAuthProvider, type User } from 'firebase/auth';
import type { AuthPort } from '../../core/ports/AuthPort';
import type { AuthIdentity } from '../../core/models/AuthIdentity';
import { OperationError } from '../../core/base/Job';
function failure(error: unknown): OperationError {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return new OperationError('cancelled');
  return new OperationError('認証操作に失敗しました。再試行してください。', 'unknown');
}
export class FirebaseAuthAdapter implements AuthPort {
  // Only constructed by the boot path after initFirebase has completed.
  constructor(private readonly auth: Auth, private readonly provider: GoogleAuthProvider) {}
  signInWithGoogle(): Promise<AuthIdentity> {
    try { return signInWithPopup(this.auth, this.provider).then(result => this.mapUser(result.user), error => { throw failure(error); }); }
    catch (error) { return Promise.reject(failure(error)); }
  }
  async signOut(): Promise<void> {
    try { await signOut(this.auth); } catch (error) { throw failure(error); }
  }
  getCurrentIdentity(): AuthIdentity | null { return this.auth.currentUser ? this.mapUser(this.auth.currentUser) : null; }
  onAuthStateChanged(listener: (identity: AuthIdentity | null) => void | Promise<void>): () => void {
    return onAuthStateChanged(this.auth, user => { void listener(user ? this.mapUser(user) : null); });
  }
  private mapUser(user: User): AuthIdentity {
    return { uid: user.uid, displayName: user.displayName, email: user.email, providerId: user.providerData.some(p => p.providerId === 'google.com') ? 'google.com' : user.providerId };
  }
}
