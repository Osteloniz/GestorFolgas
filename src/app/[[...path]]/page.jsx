"use client";

import dynamic from "next/dynamic";

const LegacyApp = dynamic(() => import("@/App"), {
  ssr: false,
  loading: () => (
    <main className="grid min-h-screen place-items-center" aria-busy="true">
      <span className="sr-only">Carregando aplicação</span>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </main>
  ),
});

export default function AppPage() {
  return <LegacyApp />;
}
