import React, { useState } from "react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Building2, FileText, Mail, ShieldCheck, SlidersHorizontal,
  Plus, Pencil, Power,
} from "lucide-react";
import { SETTINGS, DEPARTMENTS } from "@/lib/databaseData";
import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { PageHeader, SectionCard } from "@/components/ui/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { requestJson } from "@/lib/api-client";

const TABS = [
  { value: "geral", label: "Geral", icon: SettingsIcon },
  { value: "departamentos", label: "Departamentos", icon: Building2 },
  { value: "formulario", label: "Formulário Público", icon: FileText },
  { value: "emails", label: "E-mails", icon: Mail },
  { value: "seguranca", label: "Segurança", icon: ShieldCheck },
  { value: "preferencias", label: "Preferências", icon: SlidersHorizontal },
];

export default function Settings() {
  const [tab, setTab] = useState("geral");
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Ajuste as preferências do sistema." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon className="mr-1.5 h-3.5 w-3.5" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="geral"><GeneralTab /></TabsContent>
        <TabsContent value="departamentos"><DepartmentsTab /></TabsContent>
        <TabsContent value="formulario"><PublicFormTab /></TabsContent>
        <TabsContent value="emails"><EmailTab /></TabsContent>
        <TabsContent value="seguranca"><SecurityTab /></TabsContent>
        <TabsContent value="preferencias"><PreferencesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const [data, setData] = useState(SETTINGS.general);
  return (
    <SectionCard title="Configurações gerais" description="Informações básicas do sistema." action={<Button onClick={() => toast.success("Alterações salvas")}>Salvar alterações</Button>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nome do sistema"><Input value={data.systemName} onChange={(e) => setData({ ...data, systemName: e.target.value })} /></Field>
        <Field label="Nome da equipe/organização"><Input value={data.teamName} onChange={(e) => setData({ ...data, teamName: e.target.value })} /></Field>
        <Field label="Fuso horário">
          <Select value={data.timezone} onValueChange={(v) => setData({ ...data, timezone: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
              <SelectItem value="America/Manaus">America/Manaus</SelectItem>
              <SelectItem value="UTC">UTC</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Formato de data">
          <Select value={data.dateFormat} onValueChange={(v) => setData({ ...data, dateFormat: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Idioma">
          <Select value={data.language} onValueChange={(v) => setData({ ...data, language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Português (Brasil)">Português (Brasil)</SelectItem>
              <SelectItem value="English">English</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </SectionCard>
  );
}

function DepartmentsTab() {
  const [list, setList] = useState(DEPARTMENTS);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(null);

  return (
    <SectionCard title="Departamentos" description="Gerencie os departamentos da organização." action={<Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" /> Novo departamento</Button>}>
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Colaboradores</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{d.code}</TableCell>
                <TableCell>
                  <span className={d.status === "Ativo" ? "text-emerald-600" : "text-slate-400"}>{d.status}</span>
                </TableCell>
                <TableCell className="text-center">{d.employeeCount}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setConfirmToggle(d)}><Power className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {(creating || editing) && (
        <DepartmentDialog
          dept={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={async (data) => {
            try {
              await requestJson(editing ? `/api/admin/departments/${editing.id}` : "/api/admin/departments", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify({ name: data.name, code: data.code, active: data.status === "Ativo" }),
              });
              toast.success("Departamento salvo");
              window.location.reload();
            } catch (error) {
              toast.error(error.message);
            }
          }}
        />
      )}

      <ConfirmationDialog
        open={!!confirmToggle}
        onOpenChange={(o) => !o && setConfirmToggle(null)}
        title={confirmToggle?.status === "Ativo" ? "Desativar departamento" : "Ativar departamento"}
        description={confirmToggle?.status === "Ativo" ? "Colaboradores deste departamento não serão incluídos em novas campanhas." : "O departamento voltará a ser elegível para novas campanhas."}
        confirmLabel={confirmToggle?.status === "Ativo" ? "Desativar" : "Ativar"}
        destructive={confirmToggle?.status === "Ativo"}
        onConfirm={async () => {
          try {
            await requestJson(`/api/admin/departments/${confirmToggle.id}`, {
              method: "PATCH",
              body: JSON.stringify({ name: confirmToggle.name, code: confirmToggle.code, active: confirmToggle.status !== "Ativo" }),
            });
            toast.success("Departamento atualizado");
            window.location.reload();
          } catch (error) {
            toast.error(error.message);
            setConfirmToggle(null);
          }
        }}
      />
    </SectionCard>
  );
}

function DepartmentDialog({ dept, onClose, onSave }) {
  const [name, setName] = useState(dept?.name ?? "");
  const [code, setCode] = useState(dept?.code ?? "");
  const [status, setStatus] = useState(dept?.status ?? "Ativo");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dept ? "Editar departamento" : "Novo departamento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Nome *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Código (opcional)"><Input value={code} onChange={(e) => setCode(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {dept && dept.employeeCount > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Este departamento possui {dept.employeeCount} colaborador(es) vinculado(s).</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => name && onSave({ name, code, status })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PublicFormTab() {
  const [data, setData] = useState(SETTINGS.publicForm);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard title="Mensagens do formulário" action={<Button onClick={() => toast.success("Configurações salvas")}>Salvar</Button>}>
        <div className="space-y-4">
          <Field label="Título padrão"><Input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} /></Field>
          <Field label="Texto de instrução"><Textarea value={data.instruction} onChange={(e) => setData({ ...data, instruction: e.target.value })} rows={2} /></Field>
          <Field label="Mensagem de matrícula inválida"><Input value={data.invalidRegistrationMessage} onChange={(e) => setData({ ...data, invalidRegistrationMessage: e.target.value })} /></Field>
          <Field label="Mensagem de campanha encerrada"><Input value={data.closedMessage} onChange={(e) => setData({ ...data, closedMessage: e.target.value })} /></Field>
          <Field label="Mensagem de campanha agendada"><Input value={data.scheduledMessage} onChange={(e) => setData({ ...data, scheduledMessage: e.target.value })} /></Field>
          <Field label="Mensagem de sucesso"><Input value={data.successMessage} onChange={(e) => setData({ ...data, successMessage: e.target.value })} /></Field>
          <Field label="Contato do gestor"><Input value={data.managerContact} onChange={(e) => setData({ ...data, managerContact: e.target.value })} /></Field>
          <div className="space-y-2">
            <Toggle label="Exibir e-mail mascarado" checked={data.showMaskedEmail} onChange={(v) => setData({ ...data, showMaskedEmail: v })} />
            <Toggle label="Exibir capacidade numérica" checked={data.showNumericCapacity} onChange={(v) => setData({ ...data, showNumericCapacity: v })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Aparência do formulário">
        <div className="space-y-4">
          <Field label="Nome de exibição"><Input value={data.displayName} onChange={(e) => setData({ ...data, displayName: e.target.value })} /></Field>
          <Field label="Cor principal">
            <div className="flex items-center gap-2">
              <input type="color" value={data.primaryColor} onChange={(e) => setData({ ...data, primaryColor: e.target.value })} className="h-9 w-12 rounded border border-border" />
              <Input value={data.primaryColor} onChange={(e) => setData({ ...data, primaryColor: e.target.value })} className="flex-1" />
            </div>
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Pré-visualização</p>
            <div className="rounded-xl border border-border p-5" style={{ background: "#fff" }}>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: data.primaryColor }}>F</div>
                <span className="font-semibold" style={{ color: data.primaryColor }}>{data.displayName}</span>
              </div>
              <p className="text-sm text-slate-700">{data.instruction}</p>
              <div className="mt-3 rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{data.title}</p>
                <p className="mt-1 text-muted-foreground">Exemplo de data: 3 de 4 vagas utilizadas</p>
              </div>
              <button className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: data.primaryColor }}>Selecionar</button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function EmailTab() {
  const [data, setData] = useState(SETTINGS.email);
  const [subject, setSubject] = useState(data.defaultSubject);
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SectionCard title="Configurações de e-mail" action={<Button onClick={() => toast.success("Configurações salvas")}>Salvar</Button>}>
        <div className="space-y-4">
          <Field label="Nome do remetente"><Input value={data.senderName} onChange={(e) => setData({ ...data, senderName: e.target.value })} /></Field>
          <Field label="E-mail do remetente"><Input value={data.senderEmail} onChange={(e) => setData({ ...data, senderEmail: e.target.value })} /></Field>
          <Field label="Responder para"><Input value={data.replyTo} onChange={(e) => setData({ ...data, replyTo: e.target.value })} /></Field>
          <Field label="Assunto padrão"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
          <div className="space-y-2">
            <Toggle label="Enviar confirmação ao colaborador" checked={data.sendEmployeeConfirmation} onChange={(v) => setData({ ...data, sendEmployeeConfirmation: v })} />
            <Toggle label="Enviar confirmação após alteração do gestor" checked={data.sendConfirmationAfterAdminChange} onChange={(v) => setData({ ...data, sendConfirmationAfterAdminChange: v })} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pré-visualização do e-mail">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="border-b border-border bg-slate-50 px-4 py-2 text-xs text-muted-foreground">
            Para: {"{{nome}}"} · Assunto: {subject}
          </div>
          <div className="p-5 text-sm">
            <p>Olá, {"{{nome}}"}!</p>
            <p className="mt-2">Sua escolha de folga na campanha {"{{campanha}}"} foi registrada.</p>
            <div className="mt-3 rounded-lg bg-slate-50 p-3">
              <p><strong>Matrícula:</strong> {"{{matricula}}"}</p>
              <p><strong>Departamento:</strong> {"{{departamento}}"}</p>
              <p><strong>Datas:</strong> {"{{datas}}"}</p>
            </div>
            <p className="mt-3 text-muted-foreground">Em caso de dúvida, procure seu gestor.</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Variáveis disponíveis: {"{{nome}}"}, {"{{matricula}}"}, {"{{campanha}}"}, {"{{datas}}"}, {"{{departamento}}"}</p>
      </SectionCard>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <SectionCard title="Controle de acesso" description="Somente administradores ativos e com autenticação em duas etapas podem usar o painel.">
        <AdminUsersPanel />
      </SectionCard>
      <SectionCard title="Boas práticas para novos administradores">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Crie a conta da nova pessoa e envie a senha temporária por um canal seguro.</li>
          <li>Peça que ela entre e configure o próprio Google Authenticator.</li>
          <li>Confirme nesta tela que o autenticador aparece como configurado.</li>
          <li>Mantenha as contas necessárias ativas. Desative um administrador somente quando precisar revogar o acesso.</li>
        </ol>
      </SectionCard>
    </div>
  );
}

function PreferencesTab() {
  const [data, setData] = useState(SETTINGS.preferences);
  return (
    <SectionCard title="Preferências" description="Personalize sua experiência. Estas configurações são salvas localmente." action={<Button onClick={() => toast.success("Preferências salvas")}>Salvar</Button>}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tema">
          <Select value={data.theme} onValueChange={(v) => setData({ ...data, theme: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Claro">Claro</SelectItem>
              <SelectItem value="Escuro">Escuro</SelectItem>
              <SelectItem value="Sistema">Sistema</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Densidade da tabela">
          <Select value={data.tableDensity} onValueChange={(v) => setData({ ...data, tableDensity: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Confortável">Confortável</SelectItem>
              <SelectItem value="Compacta">Compacta</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Linhas por página">
          <Select value={String(data.rowsPerPage)} onValueChange={(v) => setData({ ...data, rowsPerPage: Number(v) })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Primeiro dia da semana">
          <Select value={data.firstDayOfWeek} onValueChange={(v) => setData({ ...data, firstDayOfWeek: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Domingo">Domingo</SelectItem>
              <SelectItem value="Segunda">Segunda</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Toggle label="Mostrar finais de semana no calendário" checked={data.showWeekends} onChange={(v) => setData({ ...data, showWeekends: v })} />
        </div>
      </div>
    </SectionCard>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}
