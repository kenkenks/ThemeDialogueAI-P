import { describe, it, expect, vi } from 'vitest';
import { Job } from '../src/core/base/Job';
import { GoogleSignInJob } from '../src/core/jobs/GoogleSignInJob';
import { AuthWrapper } from '../src/wrapper/AuthWrapper';

const identity = { uid: 'alice', displayName: 'Alice', email: null, providerId: 'google.com' };
const user = { userId: 'ABCDEFGHIJKLMNOPQRST', authUid: 'alice', createdAt: new Date(0).toISOString(), schemaVersion: 1 };
function fixture(repo: any = { ensureUser: vi.fn().mockResolvedValue(user) }) {
  let callback: any;
  const auth = { signInWithGoogle: vi.fn().mockResolvedValue(identity), signOut: vi.fn().mockResolvedValue(undefined), getCurrentIdentity: vi.fn().mockReturnValue(identity), onAuthStateChanged: vi.fn((cb: any) => { callback = cb; return () => {}; }) };
  const wrapper = new AuthWrapper(auth, repo);
  wrapper.start();
  return { auth, repo, wrapper, emit: (value: any) => callback(value) };
}
describe('Codex regression: explicit design contracts', () => {
  it('starts popup synchronously before execute returns a Promise', async () => {
    const f = fixture();
    const pending = new GoogleSignInJob(f.auth).execute({});
    const synchronouslyCalled = f.auth.signInWithGoogle.mock.calls.length;
    await pending;
    expect(synchronouslyCalled).toBe(1);
  });
  it('reports signOut failure rather than claiming signed out', async () => {
    const f = fixture(); await f.emit(identity);
    f.auth.signOut.mockRejectedValue(new Error('network failed'));
    await f.wrapper.signOut();
    expect(f.wrapper.getState().errorMessage).not.toBeNull();
  });
  it('attaches cleanup warning even to successful void output', async () => {
    class VoidJob extends Job<void, void> {
      protected async record() {}
      protected async cleanup() { throw new Error('cleanup failure'); }
    }
    const result = await new VoidJob().execute();
    expect(result.isSuccess).toBe(true);
    expect(result.cleanupWarning).toBeDefined();
  });
  it('attaches cleanup warning without losing original record error', async () => {
    class FailedJob extends Job<void, void> {
      protected async record(): Promise<void> { throw new Error('record failure'); }
      protected async cleanup() { throw new Error('cleanup failure'); }
    }
    const result = await new FailedJob().execute();
    expect(result.error?.message).toBe('record failure');
    expect(result.cleanupWarning).toBeDefined();
  });
  it('coalesces concurrent retries for same UID and generation', async () => {
    const f = fixture(); await f.emit(identity);
    let resolve!: (value: any) => void;
    f.repo.ensureUser.mockClear();
    f.repo.ensureUser.mockImplementation(() => new Promise(r => { resolve = r; }));
    const a = f.wrapper.retryEnsureUser();
    const b = f.wrapper.retryEnsureUser();
    await new Promise(r => setTimeout(r, 10));
    const callCount = f.repo.ensureUser.mock.calls.length;
    // Settle all pending requests independently of the assertion.
    resolve(user);
    void a; void b;
    expect(callCount).toBe(1);
  });
  it('does not replace a later ready result with an older retry failure', async () => {
    const f = fixture({ ensureUser: vi.fn().mockRejectedValue(new Error('offline')) });
    await f.emit(identity);
    expect(f.wrapper.getState().status).toBe('error');
    const pending: Array<{resolve: (x: any) => void; reject: (x: any) => void}> = [];
    f.repo.ensureUser.mockImplementation(() => new Promise((resolve, reject) => pending.push({resolve, reject})));
    const first = f.wrapper.retryEnsureUser();
    const second = f.wrapper.retryEnsureUser();
    await new Promise(r => setTimeout(r, 10));
    if (pending.length === 1) {
      pending[0].resolve(user);
    } else {
      pending[1].resolve(user); await second;
      pending[0].reject(new Error('old request failed'));
    }
    await Promise.all([first, second]);
    expect(f.wrapper.getState().status).toBe('ready');
  });
});
