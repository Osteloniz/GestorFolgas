"use client";

import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import ScrollToTop from './components/ScrollToTop';
import { Toaster as SonnerToaster } from "sonner";
import { authClient } from '@/auth/auth-client';
import { configureDatabaseData } from '@/lib/databaseData';

let adminDataPromise;

function loadAdminData() {
  if (!adminDataPromise) {
    adminDataPromise = fetch("/api/admin/bootstrap", { credentials: "include", cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Não foi possível carregar os dados do banco.");
        return response.json();
      })
      .catch((error) => {
        adminDataPromise = undefined;
        throw error;
      });
  }
  return adminDataPromise;
}

// Page imports
import Login from '@/screens/auth/Login';
import MfaVerification from '@/screens/auth/MfaVerification';
import AdminLayout from '@/components/admin/AdminLayout';
import Dashboard from '@/screens/admin/Dashboard';
import Campaigns from '@/screens/admin/Campaigns';
import CampaignDetail from '@/screens/admin/CampaignDetail';
import CampaignWizard from '@/screens/admin/CampaignWizard';
import Employees from '@/screens/admin/Employees';
import Reports from '@/screens/admin/Reports';
import Settings from '@/screens/admin/Settings';
import MyAccount from '@/screens/admin/MyAccount';
import PublicCampaign from '@/screens/public/PublicCampaign';

function ProtectedRoute() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" aria-busy="true">
        <span className="sr-only">Validando sessão</span>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

const AuthenticatedApp = () => {
  return (
    <Routes>
      {/* Public + auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/verificacao" element={<MfaVerification />} />
      <Route path="/configurar-mfa" element={<Navigate to="/verificacao" replace />} />
      <Route path="/folga/:token" element={<PublicCampaign />} />

      {/* Admin autenticado */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/campanhas" element={<Campaigns />} />
          <Route path="/admin/campanhas/nova" element={<CampaignWizard />} />
          <Route path="/admin/campanhas/:id" element={<CampaignDetail />} />
          <Route path="/admin/colaboradores" element={<Employees />} />
          <Route path="/admin/relatorios" element={<Reports />} />
          <Route path="/admin/configuracoes" element={<Settings />} />
          <Route path="/admin/minha-conta" element={<MyAccount />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function DatabaseGate({ children }) {
  const location = useLocation();
  const needsAdminData = location.pathname.startsWith("/admin") || location.pathname === "/";
  const [state, setState] = useState({ loaded: false, loading: needsAdminData, error: "" });

  useEffect(() => {
    if (!needsAdminData || state.loaded) return;
    let cancelled = false;
    setState({ loaded: false, loading: true, error: "" });
    loadAdminData()
      .then((data) => {
        if (cancelled) return;
        if (data) configureDatabaseData(data);
        setState({ loaded: true, loading: false, error: "" });
      })
      .catch((error) => {
        if (!cancelled) setState({ loaded: false, loading: false, error: error.message });
      });
    return () => { cancelled = true; };
  }, [needsAdminData, state.loaded]);

  if (needsAdminData && state.loading) {
    return <div className="fixed inset-0 flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>;
  }
  if (needsAdminData && state.error) {
    return <div className="mx-auto mt-20 max-w-md rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{state.error}</div>;
  }
  return children;
}


function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <DatabaseGate><AuthenticatedApp /></DatabaseGate>
      </Router>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
