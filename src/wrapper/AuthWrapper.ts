/** @license SPDX-License-Identifier: Apache-2.0 */
import type { AppState } from '../core/models/AppState';
import type { AuthIdentity } from '../core/models/AuthIdentity';
import type { AuthPort } from '../core/ports/AuthPort';
import type { UserRepository } from '../core/ports/UserRepository';
import { GoogleSignInJob } from '../core/jobs/GoogleSignInJob';
import { EnsureUserJob } from '../core/jobs/EnsureUserJob';
import { SignOutJob } from '../core/jobs/SignOutJob';

export class AuthWrapper {
  private generation = 0;
  private state: AppState = { status: 'restoring', identity: null, user: null, errorMessage: null, generation: 0 };
  private readonly listeners = new Set<(state: AppState) => void>();
  private unsubscribeAuthListener: (() => void) | null = null;
  private inFlight: { uid: string; generation: number; promise: Promise<void> } | null = null;
  private logoutPending = false;
  private readonly login: GoogleSignInJob;
  private readonly ensure: EnsureUserJob;
  private readonly logout: SignOutJob;
  constructor(private readonly auth: AuthPort, repository: UserRepository) {
    this.login = new GoogleSignInJob(auth);
    this.ensure = new EnsureUserJob(repository);
    this.logout = new SignOutJob(auth);
  }
  start(): void {
    if (!this.unsubscribeAuthListener) this.unsubscribeAuthListener = this.auth.onAuthStateChanged(identity => this.onIdentity(identity));
  }
  stop(): void {
    this.unsubscribeAuthListener?.();
    this.unsubscribeAuthListener = null;
    this.generation++;
    this.inFlight = null;
    this.update({ status: 'restoring', identity: null, user: null, errorMessage: null });
  }
  getState(): AppState { return this.state; }
  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener); listener(this.state);
    return () => { this.listeners.delete(listener); };
  }
  async signInWithGoogle(): Promise<void> {
    if (!['unauthenticated', 'error'].includes(this.state.status) || this.logoutPending || this.state.identity) return;
    const generation = this.generation;
    this.update({ status: 'authenticating', user: null, errorMessage: null });
    const result = await this.login.execute({});
    if (!result.isSuccess && generation === this.generation) {
      this.update({ status: 'unauthenticated', errorMessage: result.error?.message === 'cancelled' ? null : 'Googleログインに失敗しました。再度お試しください。' });
    }
  }
  async signOut(): Promise<void> {
    if (this.logoutPending) return;
    this.logoutPending = true;
    const generation = ++this.generation;
    this.inFlight = null;
    // Hide app data immediately without claiming the Auth session has ended.
    this.update({ status: 'signing-out', user: null, errorMessage: null });
    try {
      const result = await this.logout.execute();
      // Observer events (including account changes) are authoritative.
      if (generation !== this.generation) return;
      if (result.isSuccess) this.update({ status: 'unauthenticated', identity: null, user: null, errorMessage: null });
      else this.update({ status: 'error', user: null, errorMessage: 'ログアウトを完了できませんでした。再度ログアウトしてください。' });
    } finally { this.logoutPending = false; }
  }
  async retryEnsureUser(): Promise<void> {
    if (!this.state.identity || this.logoutPending) return;
    return this.runEnsure(this.state.identity, this.generation);
  }
  private async onIdentity(identity: AuthIdentity | null): Promise<void> {
    const generation = ++this.generation;
    this.inFlight = null;
    this.update({ status: identity ? 'preparing' : 'unauthenticated', identity, user: null, errorMessage: null });
    if (identity) await this.runEnsure(identity, generation);
  }
  private runEnsure(identity: AuthIdentity, generation: number): Promise<void> {
    if (this.inFlight?.uid === identity.uid && this.inFlight.generation === generation) return this.inFlight.promise;
    this.update({ status: 'preparing', user: null, errorMessage: null });
    const promise = this.ensure.execute({ authUid: identity.uid, generation }).then(result => {
      if (generation !== this.generation || this.state.identity?.uid !== identity.uid) return;
      if (result.isSuccess && result.data) this.update({ status: 'ready', user: result.data, errorMessage: null });
      else this.update({ status: 'error', user: null, errorMessage: result.error?.message || 'ユーザー情報を準備できません。再試行してください。' });
    }).finally(() => { if (this.inFlight?.promise === promise) this.inFlight = null; });
    this.inFlight = { uid: identity.uid, generation, promise };
    return promise;
  }
  private update(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial, generation: this.generation };
    for (const listener of this.listeners) { try { listener(this.state); } catch { /* A view must not invalidate a committed result. */ } }
  }
}
