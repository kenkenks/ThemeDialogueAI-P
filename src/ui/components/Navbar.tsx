/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AuthReadinessStatus } from '../../core/models/AppState';

const statusLabels: Record<AuthReadinessStatus, { label: string; color: string }> = {
  'signing-out': { label: 'ログアウト確認中', color: 'text-amber-400' },
  restoring: { label: 'セッション復元中', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  unauthenticated: { label: '未認証', color: 'bg-slate-800 text-slate-400 border-slate-700' },
  authenticating: { label: 'Google認証操作中', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  preparing: { label: 'マスタ初期化中 (ensureUser)', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  ready: { label: '利用準備完了 (Ready)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  error: { label: '初期化失敗 (Error)', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
};

export const Navbar: React.FC = () => {
  const { state } = useAuth();
  const currentStatus = statusLabels[state.status] || { label: state.status, color: 'bg-slate-800 text-slate-300' };

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
            TD
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-white tracking-tight">ThemeDialogueAI</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                EXP-002
              </span>
            </div>
            <p className="text-xs text-slate-400">Googleログイン & 初期ユーザーマスタ (R-16〜R-20)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* 状態バッジ */}
          <div className={`px-2.5 py-1 rounded-full border font-mono ${currentStatus.color}`}>
            {currentStatus.label}
          </div>

          {/* 世代番号 */}
          <div className="hidden sm:inline-block px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-slate-400 font-mono">
            Gen: #{state.generation}
          </div>
        </div>
      </div>
    </header>
  );
};
