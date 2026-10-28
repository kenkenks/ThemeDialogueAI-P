/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginCard: React.FC = () => {
  const { state, signIn } = useAuth();
  const isAuthenticating = state.status === 'authenticating';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-lg w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">ThemeDialogueAI へようこそ</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          Googleアカウントでサインインすると、専用のユーザー識別子（user_id）がFirestoreに自動初期化されます。
        </p>
      </div>

      {state.errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-3 text-rose-300 text-xs text-left">
          {state.errorMessage}
        </div>
      )}

      {/* Googleログインボタン (クリックイベントから同期的に直接ポップアップをキック) */}
      <button
        onClick={() => signIn()}
        disabled={isAuthenticating}
        className="w-full flex items-center justify-center space-x-3 px-5 py-3.5 rounded-xl bg-white text-slate-900 font-medium hover:bg-slate-100 active:scale-[0.99] transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{isAuthenticating ? 'Google認証を開いています...' : 'Googleアカウントでログイン'}</span>
      </button>

      {/* 仕様・セキュリティの明示 */}
      <div className="bg-slate-950/70 rounded-xl p-4 border border-slate-800 text-left text-xs space-y-2 text-slate-400 leading-relaxed font-mono">
        <div className="text-slate-300 font-semibold mb-1">📋 EXP-002 実装仕様</div>
        <div>• パスワード不要（平文・ハッシュともFirestoreに一切保存しません）</div>
        <div>• 認証UIDと独立した20桁の独自 <code className="text-indigo-300">user_id</code> をFirestoreで自動生成</div>
        <div>• <code className="text-slate-300">users</code> と <code className="text-slate-300">auth_bindings</code> を1トランザクションで原子作成</div>
        <div>• Security Rules による厳格な相互参照（getAfter）検証</div>
      </div>
    </div>
  );
};
