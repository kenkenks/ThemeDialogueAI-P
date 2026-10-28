/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ErrorCard: React.FC = () => {
  const { state, retry, signOut } = useAuth();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-lg w-full text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-2xl">
        !
      </div>

      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">操作を完了できませんでした</h2>
        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          {state.identity ? '認証セッションが残っています。再試行またはログアウトしてください。' : '起動設定を確認し、ページを再読み込みしてください。'}
        </p>
      </div>

      {state.errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 text-rose-300 text-xs text-left font-mono">
          {state.errorMessage}
        </div>
      )}

      {/* R-18 規約: Authアカウントは補償削除せず、同じUIDのまま再試行またはログアウトできる */}
      {!state.identity && <button onClick={() => window.location.reload()}>再読み込み</button>}
      {state.identity && <div className="space-y-3 pt-2">
        <button
          onClick={() => retry()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-md active:scale-[0.99] cursor-pointer"
        >
          同一UIDでマスタ初期化を再試行
        </button>

        <button
          onClick={() => signOut()}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
        >
          ログアウトしてやり直す
        </button>
      </div>}

      <div className="text-[11px] text-slate-500 font-mono text-left bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
        ※ REQUIREMENTS.md R-18規約に基づき、Firestoreの作成が失敗してもAuthアカウントを独自分散削除せず、同一UIDでの安全な再試行と冪等性で回復します。
      </div>
    </div>
  );
};
