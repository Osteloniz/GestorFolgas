import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2, ArrowLeft, KeyRound } from "lucide-react";
import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MfaVerification() {
  const navigate = useNavigate();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef([]);

  function handleChange(i, val) {
    const v = val.replace(/\D/g).slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setError("");
    if (v && i < 5) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length) {
      const next = pasted.split("").concat(Array(6 - pasted.length).fill(""));
      setDigits(next.slice(0, 6));
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const code = digits.join("");
    if (!useRecoveryCode && code.length < 6) {
      setError("Informe o código de 6 dígitos.");
      return;
    }
    if (useRecoveryCode && !recoveryCode.trim()) {
      setError("Informe um código de recuperação.");
      return;
    }

    setLoading(true);

    try {
      const result = useRecoveryCode
        ? await authClient.twoFactor.verifyBackupCode({
            code: recoveryCode.trim(),
            trustDevice: false,
          })
        : await authClient.twoFactor.verifyTotp({
            code,
            trustDevice: false,
          });

      if (result.error) {
        setError("Código inválido ou expirado.");
        return;
      }

      window.location.assign("/admin");
    } catch {
      setError("Não foi possível validar o código. Tente novamente.");
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
          <h1 className="mt-5 text-xl font-semibold text-slate-900">Verificação em duas etapas</h1>
          <p className="mt-1 text-sm text-slate-500">Digite o código de 6 dígitos do seu autenticador.</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
          <form onSubmit={handleVerify} className="space-y-5">
            {useRecoveryCode ? (
              <Input
                value={recoveryCode}
                onChange={(event) => {
                  setRecoveryCode(event.target.value);
                  setError("");
                }}
                autoComplete="one-time-code"
                placeholder="Código de recuperação"
                className="font-mono"
              />
            ) : (
              <div className="flex justify-between gap-2" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <Input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    value={d}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className="h-14 w-12 text-center text-xl font-semibold"
                    aria-label={`Dígito ${i + 1}`}
                  />
                ))}
              </div>
            )}

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Verificando..." : "Verificar"}
            </Button>
          </form>

          <div className="mt-5 flex flex-col gap-2 text-sm">
            <button
              className="flex items-center justify-center gap-2 text-indigo-600 hover:text-indigo-700"
              onClick={() => {
                setUseRecoveryCode((current) => !current);
                setError("");
              }}
            >
              <KeyRound className="h-4 w-4" />
              {useRecoveryCode ? "Usar código do autenticador" : "Usar código de recuperação"}
            </button>
            <button className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700" onClick={() => navigate("/login")}>
              <ArrowLeft className="h-4 w-4" /> Voltar para o login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
