/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const PreparingCard: React.FC = () => {
  const { state, signOut } = useAuth();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-lg w-full text-center space-y-6">
      <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">ユーザーマスタを準備中...</h2>
        <p className="text-sm text-slate-400 mt-2">
          Google認証が完了しました。Firestoreで独自 <code className="text-indigo-300">user_id</code> との対応付けトランザクション（<code className="text-indigo-300">ensureUser</code>）を実行しています。
        </p>
      </div>

      {state.identity && (
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-left text-xs space-y-1.5 font-mono">
          <div className="text-slate-400">Google アカウント:</div>
          <div className="text-slate-200 font-semibold">{state.identity.displayName || '未設定'}</div>
          <div className="text-slate-500 truncate">{state.identity.email}</div>
          <div className="text-slate-500 text-[11px] truncate">UID: {state.identity.uid}</div>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={() => signOut()}
          className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer transition"
        >
          キャンセルしてログアウト
        </button>
      </div>
    </div>
  );
};
