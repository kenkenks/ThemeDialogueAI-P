/** @license SPDX-License-Identifier: Apache-2.0 */
import { doc, collection, runTransaction, serverTimestamp, Timestamp, type Firestore, type Transaction } from 'firebase/firestore';
import type { UserRepository } from '../../core/ports/UserRepository';
import type { AppUser } from '../../core/models/AppUser';
import { OperationError } from '../../core/base/Job';
const invalid = () => new OperationError('ユーザー情報が不整合です。管理者へ確認してください。');
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
export class FirestoreUserRepository implements UserRepository {
  constructor(private readonly db: Firestore) {}
  private async existing(transaction: Transaction, authUid: string): Promise<AppUser | null> {
    const binding = await transaction.get(doc(this.db, 'auth_bindings', authUid));
    if (!binding.exists()) return null;
    const b = binding.data();
    if (!exactKeys(b, ['user_id', 'created_at', 'schema_version']) || typeof b.user_id !== 'string' || !/^[a-zA-Z0-9]{20}$/.test(b.user_id) || b.schema_version !== 1 || !(b.created_at instanceof Timestamp)) throw invalid();
    const snapshot = await transaction.get(doc(this.db, 'users', b.user_id));
    if (!snapshot.exists()) throw invalid();
    const u = snapshot.data();
    if (!exactKeys(u, ['user_id', 'auth_uid', 'created_at', 'schema_version']) || u.user_id !== b.user_id || u.auth_uid !== authUid || u.schema_version !== 1 || !(u.created_at instanceof Timestamp) || !u.created_at.isEqual(b.created_at)) throw invalid();
    return { userId: u.user_id, authUid, createdAt: u.created_at.toDate().toISOString(), schemaVersion: 1 };
  }
  async ensureUser(authUid: string): Promise<AppUser> {
    if (!authUid || authUid.trim() !== authUid || authUid.includes('/')) throw new OperationError('無効な認証UIDです。');
    const candidate = doc(collection(this.db, 'users'));
    try {
      const existing = await runTransaction(this.db, async transaction => {
        const user = await this.existing(transaction, authUid);
        if (user) return user;
        transaction.set(candidate, { user_id: candidate.id, auth_uid: authUid, created_at: serverTimestamp(), schema_version: 1 });
        transaction.set(doc(this.db, 'auth_bindings', authUid), { user_id: candidate.id, created_at: serverTimestamp(), schema_version: 1 });
        return null;
      });
      if (existing) return existing;
    } catch (error) {
      if (error instanceof OperationError) throw error;
      const code = (error as { code?: string })?.code;
      // Optimistic losing creates may be denied before the SDK retries.
      // Reconcile once read-only, never retry a denied write indefinitely.
      if (!['permission-denied', 'aborted', 'unavailable', 'deadline-exceeded', 'unknown'].includes(code || '')) {
        throw new OperationError('ユーザー情報の保存に失敗しました。', 'unknown');
      }
    }
    try {
      const canonical = await runTransaction(this.db, tx => this.existing(tx, authUid));
      if (canonical) return canonical;
      throw new OperationError('ユーザー情報の準備が完了していません。再試行してください。', 'unknown');
    } catch (error) {
      if (error instanceof OperationError) throw error;
      throw new OperationError('ユーザー情報を確認できません。設定と接続を確認してください。', 'unknown');
    }
  }
}
