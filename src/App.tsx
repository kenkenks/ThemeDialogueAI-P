/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './ui/context/AuthContext';
import { Navbar } from './ui/components/Navbar';
import { LoginCard } from './ui/components/LoginCard';
import { PreparingCard } from './ui/components/PreparingCard';
import { ReadyCard } from './ui/components/ReadyCard';
import { ErrorCard } from './ui/components/ErrorCard';

const MainContent: React.FC = () => {
  const { state } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
      {state.status === 'restoring' && (
        <div className="flex flex-col items-center space-y-3 text-slate-400 text-sm">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs">セッションを復元しています...</p>
        </div>
      )}

      {(state.status === 'unauthenticated' || state.status === 'authenticating') && (
        <LoginCard />
      )}

      {state.status === 'signing-out' && <p role="status">ログアウトを確認しています...</p>}
      {state.status === 'preparing' && (
        <PreparingCard />
      )}

      {state.status === 'ready' && (
        <ReadyCard />
      )}

      {state.status === 'error' && (
        <ErrorCard />
      )}
    </main>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <MainContent />
        <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-900 font-mono">
          ThemeDialogueAI Prototype • Core/Wrapper/Job Architecture • EXP-002
        </footer>
      </div>
    </AuthProvider>
  );
}
