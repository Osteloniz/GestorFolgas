import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, ShieldCheck, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/auth/auth-client";
import { PageHeader, SectionCard } from "@/components/ui/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MyAccount() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  const initials = (user?.name ?? "G").split(" ").map((s) => s[0]).slice(0, 2).join("");

  return (
    <div className="space-y-6">
      <PageHeader title="Minha conta" description="Gerencie suas informações pessoais." />

      <SectionCard title="Perfil">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-600 text-2xl font-semibold text-white">
            {initials}
          </div>
          <div className="flex-1 space-y-3">
            {editing ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setEditing(false); toast.success("Nome atualizado"); }}><Check className="mr-1.5 h-4 w-4" /> Salvar</Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setName(user?.name ?? ""); }}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-slate-900">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <p className="mt-1 text-sm"><span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Administrador</span></p>
              </div>
            )}
          </div>
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Editar nome</Button>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Ações rápidas">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.info("Abrir alteração de senha", { description: "Disponível em Configurações > Segurança." })}><KeyRound className="mr-2 h-4 w-4" /> Alterar senha</Button>
          <Button variant="outline" onClick={() => navigate("/admin/configuracoes")}><ShieldCheck className="mr-2 h-4 w-4" /> Abrir segurança</Button>
        </div>
      </SectionCard>
    </div>
  );
}
