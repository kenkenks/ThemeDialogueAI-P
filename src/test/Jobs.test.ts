/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { GoogleSignInJob } from '../core/jobs/GoogleSignInJob';
import { EnsureUserJob } from '../core/jobs/EnsureUserJob';
import { SignOutJob } from '../core/jobs/SignOutJob';
import { AuthPort } from '../core/ports/AuthPort';
import { UserRepository } from '../core/ports/UserRepository';

describe('Domain Jobs (R-16, R-17, R-20)', () => {
  it('GoogleSignInJob: ポップアップ前に非同期awaitを挟まず、AuthPortを呼び出して結果を返すこと', async () => {
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn().mockResolvedValue({
        uid: 'google_uid_123',
        displayName: 'Test User',
        email: 'test@example.com',
        providerId: 'google.com',
      }),
      signOut: vi.fn(),
      getCurrentIdentity: vi.fn(),
      onAuthStateChanged: vi.fn(),
    };

    const job = new GoogleSignInJob(mockAuthPort);
    const result = await job.execute({ isRunning: false });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.uid).toBe('google_uid_123');
    expect(mockAuthPort.signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('EnsureUserJob: authUidの検証を行い、UserRepositoryのensureUserを呼び出すこと', async () => {
    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn().mockResolvedValue({
        userId: 'usr_20charsRandomId1',
        authUid: 'google_uid_123',
        createdAt: '2026-10-28T00:00:00.000Z',
        schemaVersion: 1,
      }),
    };

    const job = new EnsureUserJob(mockUserRepo);
    const result = await job.execute({
      authUid: 'google_uid_123',
      generation: 1,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.userId).toBe('usr_20charsRandomId1');
    expect(mockUserRepo.ensureUser).toHaveBeenCalledWith('google_uid_123');
  });

  it('EnsureUserJob: 空文字のauthUidはprepareで弾かれること', async () => {
    const mockUserRepo: UserRepository = {
      ensureUser: vi.fn(),
    };

    const job = new EnsureUserJob(mockUserRepo);
    const result = await job.execute({
      authUid: '',
      generation: 1,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.error?.message).toContain('無効な認証UID');
    expect(mockUserRepo.ensureUser).not.toHaveBeenCalled();
  });

  it('SignOutJob: AuthPortのsignOutを呼び出すこと', async () => {
    const mockAuthPort: AuthPort = {
      signInWithGoogle: vi.fn(),
      signOut: vi.fn().mockResolvedValue(undefined),
      getCurrentIdentity: vi.fn(),
      onAuthStateChanged: vi.fn(),
    };

    const job = new SignOutJob(mockAuthPort);
    const result = await job.execute();

    expect(result.isSuccess).toBe(true);
    expect(mockAuthPort.signOut).toHaveBeenCalledTimes(1);
  });
});
