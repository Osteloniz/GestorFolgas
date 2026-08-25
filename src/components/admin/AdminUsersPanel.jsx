"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Plus, Power, ShieldCheck, ShieldQuestion } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/auth/auth-client";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestJson } from "@/lib/api-client";

export default function AdminUsersPanel() {
  const { data: session } = authClient.useSession();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson("/api/admin/admins");
      setAdmins(data.admins);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  async function changeStatus() {
    if (!statusTarget) return;
    setSavingStatus(true);
    try {
      await requestJson(`/api/admin/admins/${statusTarget.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !statusTarget.active }),
      });
      toast.success(statusTarget.active ? "Administrador desativado" : "Administrador ativado");
      setStatusTarget(null);
      await loadAdmins();
    } catch (cause) {
      toast.error(cause.message);
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-medium text-slate-900">Administradores</h3>
          <p className="text-sm text-muted-foreground">Cadastre quem pode acessar e administrar o sistema.</p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Novo administrador</Button>
      </div>

      {loading && <div className="flex items-center justify-center py-10 text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Carregando administradores...</div>}
      {error && <div className="flex gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {!loading && !error && (
        <div className="divide-y overflow-hidden rounded-xl border">
          {admins.map((admin) => {
            const isCurrent = admin.email.toLowerCase() === session?.user?.email?.toLowerCase();
            return (
              <div key={admin.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{admin.name}</p>
                    {isCurrent && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Você</span>}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${admin.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{admin.active ? "Ativo" : "Inativo"}</span>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{admin.email}</p>
                  <div className={`mt-1 flex items-center gap-1 text-xs ${admin.twoFactorEnabled ? "text-emerald-700" : "text-amber-700"}`}>
                    {admin.twoFactorEnabled ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldQuestion className="h-3.5 w-3.5" />}
                    {admin.twoFactorEnabled ? "Autenticador configurado" : "Configuração pendente no primeiro acesso"}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={isCurrent} onClick={() => setStatusTarget(admin)}>
                  <Power className="mr-2 h-3.5 w-3.5" />{admin.active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {creating && <CreateAdminDialog onClose={() => setCreating(false)} onCreated={async () => { setCreating(false); await loadAdmins(); }} />}
      <ConfirmationDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && !savingStatus && setStatusTarget(null)}
        title={statusTarget?.active ? "Desativar administrador" : "Ativar administrador"}
        description={statusTarget?.active ? `O acesso de ${statusTarget.name} será revogado e suas sessões serão encerradas.` : `${statusTarget?.name} poderá voltar a acessar o sistema.`}
        confirmLabel={savingStatus ? "Salvando..." : statusTarget?.active ? "Desativar" : "Ativar"}
        destructive={statusTarget?.active}
        onConfirm={changeStatus}
      />
    </div>
  );
}

function CreateAdminDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", temporaryPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const passwordValid = form.temporaryPassword.length >= 10 && /[a-z]/.test(form.temporaryPassword) && /[A-Z]/.test(form.temporaryPassword) && /\d/.test(form.temporaryPassword);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!passwordValid) return setError("A senha precisa ter 10 caracteres, letra maiúscula, minúscula e número.");
    if (form.temporaryPassword !== form.confirmPassword) return setError("As senhas não coincidem.");
    setLoading(true);
    try {
      await requestJson("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, temporaryPassword: form.temporaryPassword }),
      });
      toast.success("Administrador criado. Compartilhe a senha temporária por um canal seguro.");
      await onCreated();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo administrador</DialogTitle>
          <DialogDescription>O novo usuário configurará o próprio autenticador no primeiro acesso.</DialogDescription>
        </DialogHeader>
        <form id="create-admin-form" className="space-y-4" onSubmit={submit}>
          <Field label="Nome"><Input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
          <Field label="E-mail"><Input type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
          <Field label="Senha temporária"><Input type="password" autoComplete="new-password" value={form.temporaryPassword} onChange={(event) => setForm({ ...form, temporaryPassword: event.target.value })} required /></Field>
          <Field label="Confirmar senha"><Input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required /></Field>
          <p className="text-xs text-muted-foreground">Mínimo de 10 caracteres, com letra maiúscula, minúscula e número.</p>
          {error && <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="submit" form="create-admin-form" disabled={loading || !form.name || !form.email || !form.temporaryPassword}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar administrador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
