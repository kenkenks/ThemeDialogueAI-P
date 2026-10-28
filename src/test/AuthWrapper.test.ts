/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { AuthWrapper } from '../wrapper/AuthWrapper';
import { AuthPort } from '../core/ports/AuthPort';
import { UserRepository } from '../core/ports/UserRepository';
import { AuthIdentity } from '../core/models/AuthIdentity';

describe('AuthWrapper Facade & Generation Management (R-20, A-09, BLOCKER 3 & 4)', () => {
  it('初期状態は restoring であり、onAuthStateChanged の発火により状態が更新されること', async () => {
    let authCallback: ((id: AuthIdentity | null) => void) | null = null;
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      getCurrentIdentity: vi.fn().mockReturnValue(null),
      onAuthStateChanged: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return vi.fn();
      }),
    };

    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockResolvedValue({
        userId: 'test_user_id_123456',
        authUid: 'test_uid_1',
        createdAt: '2026-10-28T00:00:00Z',
        schemaVersion: 1,
      }),
    };

    const wrapper = new AuthWrapper(mockAuthPort, mockUserRepo);
    expect(wrapper.getState().status).toBe('restoring');

    wrapper.start();
    expect(mockAuthPort.onAuthStateChanged).toHaveBeenCalled();

    // ユーザー未ログインの通知
    authCallback!(null);
    expect(wrapper.getState().status).toBe('unauthenticated');
    expect(wrapper.getState().user).toBeNull();
  });

  it('認証成功時に preparing を経由して ready に遷移すること', async () => {
    let authCallback: ((id: AuthIdentity | null) => void) | null = null;
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      getCurrentIdentity: vi.fn().mockReturnValue(null),
      onAuthStateChanged: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return vi.fn();
      }),
    };

    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockResolvedValue({
        userId: 'test_user_id_123456',
        authUid: 'test_uid_1',
        createdAt: '2026-10-28T00:00:00Z',
        schemaVersion: 1,
      }),
    };

    const wrapper = new AuthWrapper(mockAuthPort, mockUserRepo);
    wrapper.start();

    // ログイン通知
    await authCallback!({
      uid: 'test_uid_1',
      displayName: 'テストユーザー',
      email: 'test@example.com',
      providerId: 'google.com',
    });
    // 非同期ジョブの完了を待機
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = wrapper.getState();
    expect(state.status).toBe('ready');
    expect(state.user?.userId).toBe('test_user_id_123456');
    expect(state.identity?.uid).toBe('test_uid_1');
  });

  it('A-09 / R-20準拠: 準備中にログアウトや切替が発生した場合、遅延完了した旧ユーザー結果を公開しないこと', async () => {
    let authCallback: ((id: AuthIdentity | null) => void) | null = null;
    let resolveFirstEnsure: ((user: any) => void) | null = null;

    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
      getCurrentIdentity: vi.fn().mockReturnValue(null),
      onAuthStateChanged: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return vi.fn();
      }),
    };

    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFirstEnsure = resolve;
        });
      }),
    };

    const wrapper = new AuthWrapper(mockAuthPort, mockUserRepo);
    wrapper.start();

    // ユーザーAのログイン通知（ensureUserがペンディング）
    const userAPromise = authCallback!({
      uid: 'user_a_uid',
      displayName: 'User A',
      email: 'a@example.com',
      providerId: 'google.com',
    });

    expect(wrapper.getState().status).toBe('preparing');
    expect(wrapper.getState().identity?.uid).toBe('user_a_uid');

    // 直後にログアウト実行（世代が進む）
    await wrapper.signOut();
    expect(wrapper.getState().status).toBe('unauthenticated');
    expect(wrapper.getState().identity).toBeNull();
    expect(wrapper.getState().user).toBeNull();

    // ペンディングだったユーザーAのensureUserが遅延完了
    resolveFirstEnsure!({
      userId: 'user_a_master_id',
      authUid: 'user_a_uid',
      createdAt: '2026-10-28T00:00:00Z',
      schemaVersion: 1,
    });

    await userAPromise;

    // 世代チェックにより、遅れて完了したUser Aの結果は破棄され、未認証が維持されること！
    expect(wrapper.getState().status).toBe('unauthenticated');
    expect(wrapper.getState().user).toBeNull();
  });

  it('BLOCKER 3対応: ログアウト失敗時に未認証状態へ遷移せず、エラーを表示して現状態を維持すること', async () => {
    let authCallback: ((id: AuthIdentity | null) => void) | null = null;
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn().mockRejectedValue(new Error('Firebase signOut failed due to network error')),
      getCurrentIdentity: vi.fn().mockReturnValue(null),
      onAuthStateChanged: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return vi.fn();
      }),
    };

    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockResolvedValue({
        userId: 'test_user_id_123456',
        authUid: 'test_uid_1',
        createdAt: '2026-10-28T00:00:00Z',
        schemaVersion: 1,
      }),
    };

    const wrapper = new AuthWrapper(mockAuthPort, mockUserRepo);
    wrapper.start();

    // ログイン通知 -> ready状態にする
    await authCallback!({
      uid: 'test_uid_1',
      displayName: 'テストユーザー',
      email: 'test@example.com',
      providerId: 'google.com',
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(wrapper.getState().status).toBe('ready');

    // ログアウトを実行（失敗する）
    await wrapper.signOut();

    // Authの本人性は維持し、アプリuserは非表示。未完了を明示する。
    const state = wrapper.getState();
    expect(state.status).toBe('error');
    expect(state.identity?.uid).toBe('test_uid_1');
    expect(state.user).toBeNull();
    expect(state.errorMessage).toContain('ログアウトを完了できません');
  });

  it('BLOCKER 4対応: 同一Auth UIDの並行初期化でも同一Promiseにまとめられ、同じuser_idへ正常に収束すること', async () => {
    let authCallback: ((id: AuthIdentity | null) => void) | null = null;
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      getCurrentIdentity: vi.fn().mockReturnValue(null),
      onAuthStateChanged: vi.fn().mockImplementation((cb) => {
        authCallback = cb;
        return vi.fn();
      }),
    };

    let ensureUserCallCount = 0;
    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockImplementation(async (authUid: string) => {
        ensureUserCallCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          userId: 'consistent_user_id_9999',
          authUid,
          createdAt: '2026-10-28T00:00:00Z',
          schemaVersion: 1,
        };
      }),
    };

    const wrapper = new AuthWrapper(mockAuthPort, mockUserRepo);
    wrapper.start();

    const identity: AuthIdentity = {
      uid: 'same_auth_uid_123',
      displayName: '並行テストユーザー',
      email: 'parallel@example.com',
      providerId: 'google.com',
    };

    // 同一UIDで通知と再試行が並行して走る状況をシミュレート
    const p1 = authCallback!(identity);
    const p2 = wrapper.retryEnsureUser();

    await Promise.all([p1, p2]);
    await new Promise((resolve) => setTimeout(resolve, 30));

    // 同一UID・同一世代の呼び出しがまとめられ、同じuser_idに収束すること
    expect(ensureUserCallCount).toBe(1);
    expect(wrapper.getState().status).toBe('ready');
    expect(wrapper.getState().user?.userId).toBe('consistent_user_id_9999');
  });
});
