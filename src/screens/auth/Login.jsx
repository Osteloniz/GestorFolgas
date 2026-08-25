import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });
      if (result.error) {
        setError("E-mail ou senha incorretos. Tente novamente.");
        return;
      }

      if (result.data?.twoFactorRedirect) {
        navigate("/verificacao");
        return;
      }

      window.location.assign(result.data?.user?.twoFactorEnabled === true ? "/admin" : "/configurar-mfa");
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold text-slate-900">Gestão de Compensações</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse o painel de gestão</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Entrar</h2>
          <p className="mt-1 text-sm text-slate-500">Use suas credenciais corporativas.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || !email || !password}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-400">Acesso restrito a administradores autorizados.</p>
        </div>
      </div>
    </div>
  );
}
