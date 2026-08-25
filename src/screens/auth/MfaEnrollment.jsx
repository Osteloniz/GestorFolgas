"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { AlertCircle, CheckCircle2, Copy, Download, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MfaEnrollment() {
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [step, setStep] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startEnrollment(event) {
    event.preventDefault();
    if (newPassword.length < 10 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("A nova senha precisa ter 10 caracteres, letra maiúscula, minúscula e número.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As novas senhas não coincidem.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const changed = await authClient.changePassword({ currentPassword: password, newPassword, revokeOtherSessions: true });
      if (changed.error) throw new Error("A senha temporária informada está incorreta.");
      const result = await authClient.twoFactor.enable({ password: newPassword, method: "totp" });
      if (result.error || !result.data?.totpURI) throw new Error("Senha inválida ou não foi possível iniciar a configuração.");
      setQrCode(await QRCode.toDataURL(result.data.totpURI, { width: 256, margin: 1 }));
      setBackupCodes(result.data.backupCodes || []);
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStep("verify");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a configuração.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await authClient.twoFactor.verifyTotp({ code: code.replace(/\D/g, ""), trustDevice: false });
      if (result.error) throw new Error("Código inválido. Confira o aplicativo e tente novamente.");
      setStep("recovery");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível validar o código.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCodes() {
    const content = ["Códigos de recuperação — Gestão de Compensações", "", ...backupCodes].join("\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "codigos-recuperacao.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyCodes() {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("Códigos copiados");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-7 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Proteja seu acesso</h1>
            <p className="mt-1 text-sm text-slate-500">A autenticação em duas etapas é obrigatória para administradores.</p>
          </div>
        </div>

        {step === "password" && (
          <form className="mt-7 space-y-4" onSubmit={startEnrollment}>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-password">Senha temporária</Label>
              <Input id="mfa-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-new-password">Crie sua nova senha</Label>
              <Input id="mfa-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-confirm-password">Confirme a nova senha</Label>
              <Input id="mfa-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
            </div>
            <p className="text-xs text-muted-foreground">Use ao menos 10 caracteres, com letra maiúscula, minúscula e número.</p>
            <Button className="w-full" disabled={loading || !password}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Trocar senha e configurar autenticador
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form className="mt-7 space-y-5" onSubmit={verifyCode}>
            <div className="text-center">
              <p className="text-sm text-slate-600">Leia o QR Code no Google Authenticator ou em outro aplicativo compatível.</p>
              {qrCode && <img src={qrCode} alt="QR Code para configurar autenticação em duas etapas" className="mx-auto mt-4 h-56 w-56 rounded-lg border" />}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
              <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required />
            </div>
            <Button className="w-full" disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Validar e ativar
            </Button>
          </form>
        )}

        {step === "recovery" && (
          <div className="mt-7 space-y-5">
            <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">Autenticador ativado. Guarde os códigos abaixo antes de continuar; cada código só pode ser usado uma vez.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-slate-50 p-4">
              {backupCodes.map((item) => <code key={item} className="text-sm">{item}</code>)}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={copyCodes}><Copy className="mr-2 h-4 w-4" />Copiar</Button>
              <Button type="button" variant="outline" onClick={downloadCodes}><Download className="mr-2 h-4 w-4" />Baixar</Button>
            </div>
            <Button className="w-full" onClick={() => window.location.assign("/admin")}>Já guardei os códigos — entrar</Button>
          </div>
        )}

        {error && <div className="mt-4 flex gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      </div>
    </div>
  );
}
