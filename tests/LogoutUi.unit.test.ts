import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthWrapper } from '../src/wrapper/AuthWrapper';
const context = vi.hoisted(() => ({ state: {} as any }));
vi.mock('../src/ui/context/AuthContext', () => ({ useAuth: () => ({ state: context.state, signOut: async () => {} }) }));
import { ReadyCard } from '../src/ui/components/ReadyCard';
const user = { userId: 'ABCDEFGHIJKLMNOPQRST', authUid: 'alice', createdAt: new Date(0).toISOString(), schemaVersion: 1 };
const identity = { uid: 'alice', displayName: 'Alice', email: null, providerId: 'google.com' };
describe('Delta verification: signOut result propagation', () => {
  it('must render the logout failure stored by Wrapper', () => {
    context.state = { status: 'ready', user, identity, errorMessage: 'ログアウトに失敗しました', generation: 1 };
    expect(renderToStaticMarkup(React.createElement(ReadyCard))).toContain('ログアウトに失敗しました');
  });
  it('must not publish a pending old ensure after logout starts', async () => {
    let emit!: (x: any) => Promise<void>;
    let finishEnsure!: (x: any) => void; let finishLogout!: () => void;
    const auth = { signInWithGoogle: vi.fn(), getCurrentIdentity: () => identity,
      signOut: () => new Promise<void>(r => { finishLogout = r; }),
      onAuthStateChanged: (cb: any) => { emit = cb; return () => {}; } };
    const repo = { ensureUser: () => new Promise<any>(r => { finishEnsure = r; }) };
    const wrapper = new AuthWrapper(auth, repo); wrapper.start();
    const ensure = emit(identity); await new Promise(r => setTimeout(r, 5));
    const logout = wrapper.signOut(); await new Promise(r => setTimeout(r, 5));
    finishEnsure(user); await ensure;
    const statusWhileLogoutPending = wrapper.getState().status;
    finishLogout(); await logout;
    expect(statusWhileLogoutPending).not.toBe('ready');
  });
});
