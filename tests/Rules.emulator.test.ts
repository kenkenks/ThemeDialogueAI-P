import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import { initializeTestEnvironment, assertSucceeds, assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, writeBatch, serverTimestamp, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { FirestoreUserRepository } from '../src/wrapper/adapters/FirestoreUserRepository';

let env: RulesTestEnvironment;
const id = 'ABCDEFGHIJKLMNOPQRST';
const id2 = 'abcdefghijklmnopqrst';
const google = (uid = 'alice') => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();
function user(uid = 'alice', key = id) { return { user_id: key, auth_uid: uid, created_at: serverTimestamp(), schema_version: 1 }; }
function binding(key = id) { return { user_id: key, created_at: serverTimestamp(), schema_version: 1 }; }
function pair(db: any, uid = 'alice', key = id, userExtra = {}, bindExtra = {}) {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users', key), { ...user(uid, key), ...userExtra });
  batch.set(doc(db, 'auth_bindings', uid), { ...binding(key), ...bindExtra });
  return batch.commit();
}
beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-themedialogueai', firestore: { host: '127.0.0.1', port: 18080, rules: readFileSync('firestore.rules', 'utf8') } });
}, 30000);
beforeEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env?.cleanup(); });

describe('Codex: actual Firestore Emulator allow/deny', () => {
  it('allows own missing binding get and atomic pair creation / own reads', async () => {
    const db = google();
    expect((await assertSucceeds(getDoc(doc(db, 'auth_bindings', 'alice')))).exists()).toBe(false);
    await assertSucceeds(pair(db));
    await assertSucceeds(getDoc(doc(db, 'users', id)));
  });
  it('denies unauthenticated reads and writes', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'auth_bindings', 'alice')));
    await assertFails(pair(db));
  });
  it('denies non-Google provider', async () => {
    const db = env.authenticatedContext('alice', { firebase: { sign_in_provider: 'password' } }).firestore();
    await assertFails(pair(db));
    await assertFails(getDoc(doc(db, 'auth_bindings', 'alice')));
  });
  it('denies another UID reading or writing owner documents', async () => {
    await pair(google());
    const db = google('bob');
    await assertFails(getDoc(doc(db, 'users', id)));
    await assertFails(getDoc(doc(db, 'auth_bindings', 'alice')));
    await assertFails(pair(db, 'alice', id2));
  });
  it('denies binding-only creation', async () => { const db = google(); await assertFails(setDoc(doc(db, 'auth_bindings', 'alice'), binding())); });
  it('denies user-only creation', async () => { const db = google(); await assertFails(setDoc(doc(db, 'users', id), user())); });
  it('denies mismatched pair', async () => { await assertFails(pair(google(), 'alice', id, {}, { user_id: id2 })); });
  it('denies extra fields in either document', async () => {
    await assertFails(pair(google(), 'alice', id, { role: 'admin' }));
    await assertFails(pair(google(), 'alice', id, {}, { role: 'admin' }));
  });
  it('denies invalid id, schema and forged timestamp', async () => {
    await assertFails(pair(google(), 'alice', 'short'));
    await assertFails(pair(google(), 'alice', id, { schema_version: 2 }));
    await assertFails(pair(google(), 'alice', id, { created_at: Timestamp.fromMillis(0) }));
  });
  it('denies owner update, delete and list', async () => {
    const db = google(); await pair(db);
    for (const [name, key] of [['users', id], ['auth_bindings', 'alice']]) {
      await assertFails(updateDoc(doc(db, name, key), { schema_version: 1 }));
      await assertFails(deleteDoc(doc(db, name, key)));
      await assertFails(getDocs(collection(db, name)));
    }
  });
  it('denies second user document and binding replacement', async () => {
    const db = google(); await pair(db);
    await assertFails(setDoc(doc(db, 'users', id2), user('alice', id2)));
    await assertFails(pair(db, 'alice', id2));
  });
  it('denies overwriting another user id and other collection paths', async () => {
    await pair(google()); const db = google('bob');
    await assertFails(pair(db, 'bob', id));
    await assertFails(setDoc(doc(db, 'conversations', 'x'), { owner_user_id: id }));
  });
  it('repository initializes then returns same id on repeated call', async () => {
    const repo = new FirestoreUserRepository(google() as any);
    const first = await repo.ensureUser('alice');
    const second = await repo.ensureUser('alice');
    expect(second.userId).toBe(first.userId);
    expect(first.userId).toMatch(/^[a-zA-Z0-9]{20}$/);
  });
  it('5 concurrent initializations converge to exactly one pair', async () => {
    const repos = Array.from({ length: 5 }, () => new FirestoreUserRepository(google() as any));
    const settled = await Promise.allSettled(repos.map(repo => repo.ensureUser('alice')));
    const successful = settled.filter((x): x is PromiseFulfilledResult<any> => x.status === 'fulfilled');
    const rejected = settled.filter((x): x is PromiseRejectedResult => x.status === 'rejected');
    console.log('Concurrent outcomes:', successful.length, 'success;', rejected.map(x => x.reason.code));
    const users = successful.map(x => x.value);
    expect(new Set(users.map(x => x.userId)).size).toBe(1);
    await env.withSecurityRulesDisabled(async ctx => {
      expect((await getDocs(collection(ctx.firestore(), 'users'))).size).toBe(1);
      expect((await getDocs(collection(ctx.firestore(), 'auth_bindings'))).size).toBe(1);
    });
    const retry = await repos[0].ensureUser('alice');
    expect(retry.userId).toBe(users[0].userId);
    expect(rejected).toHaveLength(0);
  });
});

describe('Codex regression: malformed existing data must fail closed', () => {
  it('rejects a missing created_at instead of fabricating client time', async () => {
    await env.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'auth_bindings', 'alice'), { user_id: id, schema_version: 1 });
      await setDoc(doc(db, 'users', id), { user_id: id, auth_uid: 'alice', schema_version: 1 });
    });
    await expect(new FirestoreUserRepository(google() as any).ensureUser('alice')).rejects.toThrow();
  });
});
