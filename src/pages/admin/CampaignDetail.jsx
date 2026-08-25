import React, { useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Link as LinkIcon, ExternalLink, Pencil, XCircle, CalendarOff,
  Copy, Users, UserX,
} from "lucide-react";
import { toast } from "sonner";
import {
  campaignById, campaignKpis, departmentSummary, submissionsForCampaign,
  pendingEmployees, CAMPAIGN_HISTORY, formatDatePT, formatDateTimePT, departmentName,
  employeeById, DEPARTMENTS,
} from "@/lib/databaseData";
import { PageHeader, MetricCard, SectionCard, EmptyState } from "@/components/ui/common";
import { CampaignBadge, ResponseBadge } from "@/components/ui/badges";
import { Breadcrumbs } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { requestJson } from "@/lib/api-client";
import { Users as UsersIcon, UserCheck, PieChart, CalendarCheck, Building2 } from "lucide-react";

const WEEKDAY_LABELS = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado", domingo: "Domingo" };

export default function CampaignDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const campaign = campaignById(id);
  const [tab, setTab] = useState(searchParams.get("tab") || "visao-geral");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  if (!campaign) {
    return <EmptyState title="Campanha não encontrada" description="A campanha solicitada não existe." />;
  }

  const kpis = campaignKpis(campaign);
  const summary = departmentSummary(campaign);
  const subs = submissionsForCampaign(campaign.id);
  const pending = pendingEmployees(campaign);
  const history = CAMPAIGN_HISTORY[campaign.id] ?? [];

  function changeTab(t) {
    setTab(t);
    setSearchParams({ tab: t });
  }

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/folga/${campaign.publicToken}`);
    toast.success("Link copiado");
  }

  async function cancelCampaign() {
    if (cancelReason.trim().length < 3) {
      toast.error("Informe o motivo do cancelamento.");
      return;
    }
    try {
      await requestJson(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      toast.success("Campanha cancelada", { description: "O formulário público deixou de aceitar respostas." });
      window.location.reload();
    } catch (error) {
      toast.error(error.message);
      setCancelOpen(false);
      setCancelReason("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Breadcrumbs items={[{ to: "/admin/campanhas", label: "Campanhas" }, { label: campaign.name }]} />
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/campanhas")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>

      <PageHeader title={campaign.name} description={campaign.description}>
        <CampaignBadge status={campaign.status} />
        <Button variant="outline" onClick={copyLink}><LinkIcon className="mr-2 h-4 w-4" /> Copiar link</Button>
        <Button variant="outline" onClick={() => navigate(`/folga/${campaign.publicToken}`)}><ExternalLink className="mr-2 h-4 w-4" /> Abrir formulário</Button>
        {campaign.status !== "Cancelada" && campaign.status !== "Encerrada" && (
          <Button variant="outline" className="text-rose-600" onClick={() => setCancelOpen(true)}><XCircle className="mr-2 h-4 w-4" /> Cancelar</Button>
        )}
      </PageHeader>

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="regras">Regras</TabsTrigger>
          <TabsTrigger value="respostas">Respostas</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard label="Elegíveis" value={kpis.eligible} icon={UsersIcon} accent="slate" />
            <MetricCard label="Responderam" value={kpis.responded} icon={UserCheck} accent="emerald" />
            <MetricCard label="Participação" value={`${kpis.participation}%`} icon={PieChart} accent="indigo" />
            <MetricCard label="Total de escolhas" value={kpis.totalChoices} icon={CalendarCheck} accent="blue" />
            <MetricCard label="Departamentos" value={kpis.departments} icon={Building2} accent="slate" />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Informações da campanha">
              <dl className="space-y-3 text-sm">
                <Row label="Nome" value={campaign.name} />
                <Row label="Descrição" value={campaign.description || "—"} />
                <Row label="Status" value={<CampaignBadge status={campaign.status} />} />
                <Row label="Feriados" value={campaign.holidays.map((h) => `${formatDatePT(h.date)} (${h.name})`).join(", ")} />
                <Row label="Folgas por colaborador" value={campaign.leaveDaysPerEmployee} />
                <Row label="Período de resposta" value={`${formatDatePT(campaign.responsePeriod.start)} — ${formatDatePT(campaign.responsePeriod.end)}`} />
                <Row label="Período de folgas" value={`${formatDatePT(campaign.leavePeriod.start)} — ${formatDatePT(campaign.leavePeriod.end)}`} />
                <Row label="Link público" value={<code className="text-xs text-indigo-600">/folga/{campaign.publicToken}</code>} />
                <Row label="Departamentos" value={campaign.departmentIds.map((d) => departmentName(d)).join(", ")} />
              </dl>
            </SectionCard>

            <SectionCard title="Resumo por departamento">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Elegíveis</TableHead>
                    <TableHead className="text-center">Resp.</TableHead>
                    <TableHead className="text-center">Part.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-center">{d.eligible}</TableCell>
                      <TableCell className="text-center">{d.responded}</TableCell>
                      <TableCell className="text-center font-medium">{d.participation}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          </div>
        </TabsContent>

        {/* Regras */}
        <TabsContent value="regras">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {campaign.departmentIds.map((depId) => {
              const rules = campaign.rules[depId] || {};
              const activeDays = Object.entries(rules).filter(([, v]) => v > 0);
              return (
                <SectionCard key={depId} title={departmentName(depId)} action={<Button variant="outline" size="sm" onClick={() => toast.success("Editor de regras aberto")}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar regras</Button>}>
                  <div className="space-y-2">
                    {Object.entries(rules).map(([day, cap]) => (
                      <div key={day} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                        <span className="font-medium">{WEEKDAY_LABELS[day]}</span>
                        <div className="flex items-center gap-3">
                          <span className={cap > 0 ? "text-emerald-600" : "text-slate-400"}>{cap > 0 ? "Ativo" : "Inativo"}</span>
                          {cap > 0 && <span className="text-muted-foreground">Capacidade <span className="font-medium text-slate-900">{cap}</span></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {campaign.exceptions.filter((e) => e.departmentId === depId).length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Exceções</p>
                      <div className="space-y-1.5">
                        {campaign.exceptions.filter((e) => e.departmentId === depId).map((e) => (
                          <div key={e.id} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
                            <CalendarOff className="h-3.5 w-3.5" />
                            {formatDatePT(e.date)} · {e.type}{e.note ? ` — ${e.note}` : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              );
            })}
          </div>
        </TabsContent>

        {/* Respostas */}
        <TabsContent value="respostas">
          <ResponsesTab campaign={campaign} subs={subs} />
        </TabsContent>

        {/* Pendentes */}
        <TabsContent value="pendentes">
          <PendingTab campaign={campaign} pending={pending} />
        </TabsContent>

        {/* Histórico */}
        <TabsContent value="historico">
          <SectionCard title="Histórico administrativo">
            {history.length ? (
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="relative pl-5">
                    <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                    <div className="absolute left-[3px] top-3.5 h-full w-px bg-border" />
                    <p className="text-sm font-medium text-slate-900">{h.action}</p>
                    <p className="text-sm text-muted-foreground">{h.detail}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTimePT(h.at)} · {h.admin}</p>
                  </div>
                ))}
              </div>
            ) : <EmptyState title="Sem histórico" />}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancelar campanha"
        description="O formulário público deixará de aceitar respostas, mas os dados existentes serão preservados."
        confirmLabel="Cancelar campanha"
        destructive
        onConfirm={cancelCampaign}
      >
        <div className="py-2">
          <label className="mb-1.5 block text-sm font-medium">Motivo do cancelamento *</label>
          <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Descreva o motivo..." />
        </div>
      </ConfirmationDialog>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-2 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-slate-900 sm:text-right">{value}</dd>
    </div>
  );
}

function ResponsesTab({ campaign, subs }) {
  const [search, setSearch] = useState("");
  const [dep, setDep] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [justif, setJustif] = useState("all");

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      const emp = employeeById(s.employeeId);
      if (!emp) return false;
      if (search && !emp.name.toLowerCase().includes(search.toLowerCase()) && !emp.registration.includes(search)) return false;
      if (dep !== "all" && emp.departmentId !== dep) return false;
      if (dateFilter !== "all" && !s.dates.includes(dateFilter)) return false;
      if (justif === "com" && !s.justification) return false;
      if (justif === "sem" && s.justification) return false;
      return true;
    });
  }, [subs, search, dep, dateFilter, justif]);

  return (
    <SectionCard title="Respostas dos colaboradores" description={`${filtered.length} de ${subs.length} respostas.`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="sm:max-w-xs" />
        <Select value={dep} onValueChange={setDep}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Data" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as datas</SelectItem>
            <SelectItem value="2026-11-05">05/11/2026</SelectItem>
            <SelectItem value="2026-11-15">15/11/2026</SelectItem>
            <SelectItem value="2026-11-18">18/11/2026</SelectItem>
          </SelectContent>
        </Select>
        <Select value={justif} onValueChange={setJustif}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Justificativa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="com">Com justificativa</SelectItem>
            <SelectItem value="sem">Sem justificativa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma resposta" description="Nenhum registro corresponde aos filtros." icon={UserX} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Departamento</TableHead>
                <TableHead>Datas</TableHead>
                <TableHead className="hidden lg:table-cell">Justificativa</TableHead>
                <TableHead className="hidden md:table-cell">Enviado em</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const emp = employeeById(s.employeeId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{emp.registration}</TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{departmentName(emp.departmentId)}</TableCell>
                    <TableCell>{s.dates.map((d) => formatDatePT(d)).join(", ")}</TableCell>
                    <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-muted-foreground">{s.justification || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{formatDateTimePT(s.submittedAt)}</TableCell>
                    <TableCell><ResponseBadge status={s.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

function PendingTab({ campaign, pending }) {
  const [search, setSearch] = useState("");
  const [dep, setDep] = useState("all");

  const filtered = pending.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.registration.includes(search)) return false;
    if (dep !== "all" && e.departmentId !== dep) return false;
    return true;
  });

  return (
    <SectionCard title="Colaboradores pendentes" description={`${filtered.length} pendentes.`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="sm:max-w-xs" />
        <Select value={dep} onValueChange={setDep}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <EmptyState title="Ninguém pendente" description="Todos os colaboradores elegíveis já responderam." icon={Users} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden md:table-cell">Departamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.registration}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.email}</TableCell>
                  <TableCell className="hidden md:table-cell">{departmentName(e.departmentId)}</TableCell>
                  <TableCell><ResponseBadge status="Pendente" /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard?.writeText(e.email); toast.success("E-mail copiado"); }}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => toast.success("Marcado como contatado", { description: e.name })}>Marcar contatado</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}
