/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';

export const ReadyCard: React.FC = () => {
  const { state, signOut } = useAuth();
  const user = state.user;
  const identity = state.identity;

  if (!user) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl max-w-xl w-full space-y-6">
      {state.errorMessage && <p role="alert">{state.errorMessage}</p>}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">利用準備完了 (Ready)</h2>
            <p className="text-xs text-slate-400">ユーザーマスタと認証バインディングの整合を確認しました</p>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition cursor-pointer"
        >
          ログアウト
        </button>
      </div>

      {/* ユーザー識別子の詳細表示 */}
      <div className="space-y-4">
        {/* アプリ独自 user_id */}
        <div className="bg-slate-950 rounded-xl p-4 border border-indigo-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold text-indigo-400 uppercase tracking-wider text-[11px]">
              アプリ独自 ユーザーID (user_id)
            </span>
            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800">
              owner_user_id / sender_id
            </span>
          </div>
          <div className="font-mono text-base font-bold text-white tracking-wide break-all selection:bg-indigo-500 selection:text-white">
            {user.userId}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            ※ Firestore自動生成の不変IDです。将来の対話・可変辞書・気持ち履歴の帰属先（<code className="text-indigo-300">owner_user_id</code>）として紐づけられます。
          </p>
        </div>

        {/* 認証情報およびマスタ詳細 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-500 block mb-1">Google 表示名 (UI参照用テキスト)</span>
            <span className="text-slate-200 font-medium truncate block">
              {identity?.displayName || '未設定'}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">※ 一意キーや認証IDとしては使用しません</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-500 block mb-1">Google Auth UID</span>
            <span className="text-slate-300 truncate block font-mono text-[11px]">
              {user.authUid}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1">auth_bindings/{user.authUid}</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-500 block mb-1">スキーマバージョン</span>
            <span className="text-slate-300 font-semibold">v{user.schemaVersion}</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-slate-500 block mb-1">作成日時 (Server Timestamp)</span>
            <span className="text-slate-300 text-[11px]">
              {new Date(user.createdAt).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      </div>

      {/* アーキテクチャ準拠情報 */}
      <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80 text-xs text-slate-400 space-y-1.5 font-mono">
        <div className="text-slate-300 font-semibold mb-1 text-[11px]">🛡️ 設計契約の準拠確認 (EXP-002)</div>
        <div className="flex items-center text-emerald-400 space-x-1.5">
          <span>✓</span>
          <span>Core (Job) と Wrapper の責務完全分離（CMRPライフサイクル）</span>
        </div>
        <div className="flex items-center text-emerald-400 space-x-1.5">
          <span>✓</span>
          <span>1対1不変バインディング（auth_bindings ↔ users）</span>
        </div>
        <div className="flex items-center text-emerald-400 space-x-1.5">
          <span>✓</span>
          <span>Firestore Security Rules（相互参照・作成のみ許可・全update/delete拒否）</span>
        </div>
        <div className="flex items-center text-emerald-400 space-x-1.5">
          <span>✓</span>
          <span>世代番号管理（Generation #{state.generation}）によるアカウント切替防御</span>
        </div>
      </div>
    </div>
  );
};
