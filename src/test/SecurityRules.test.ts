/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Security Rules Specification Check (A-05〜A-08)', () => {
  const rulesPath = path.resolve(__dirname, '../../firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('デフォルト全拒否（match /{document=**} allow read, write: if false）が存在すること', () => {
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');
  });

  it('Google認証プロバイダ制限（isGoogleAuth: google.com）が定義されていること', () => {
    expect(rulesContent).toContain("request.auth.token.firebase.sign_in_provider == 'google.com'");
  });

  it('user_idが20桁の英数字（^[a-zA-Z0-9]+$）として検証されていること', () => {
    expect(rulesContent).toContain('id.size() == 20');
    expect(rulesContent).toContain("id.matches('^[a-zA-Z0-9]+$')");
  });

  it('auth_bindings と users の全 update, delete, list が本人含め明示的に拒否されていること', () => {
    const updateDeleteCount = (rulesContent.match(/allow update, delete, list: if false;/g) || []).length;
    expect(updateDeleteCount).toBe(2);
  });

  it('schema_version == 1 および created_at == request.time が強制されていること', () => {
    expect(rulesContent).toContain('request.resource.data.schema_version == 1');
    expect(rulesContent).toContain('request.resource.data.created_at == request.time');
  });

  it('getAfter による相互参照が auth_bindings と users の両方で検証されていること', () => {
    expect(rulesContent).toContain('getAfter(/databases/$(database)/documents/users/');
    expect(rulesContent).toContain('getAfter(/databases/$(database)/documents/auth_bindings/');
  });
});
