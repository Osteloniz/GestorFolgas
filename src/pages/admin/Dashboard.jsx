import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserX, PieChart, CalendarCheck, Building2,
  Link as LinkIcon, ExternalLink, MoreHorizontal, Send, Pencil, Calendar as CalIcon, User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  CAMPAIGNS, campaignById, campaignKpis, departmentSummary, mostRequestedDates,
  pendingEmployees, RECENT_ACTIVITY, formatDatePT, formatDateTimePT, departmentName,
  CAMPAIGN_HISTORY, DEPARTMENTS,
} from "@/lib/databaseData";
import { PageHeader, MetricCard, SectionCard, EmptyState } from "@/components/ui/common";
import { CampaignBadge, ResponseBadge } from "@/components/ui/badges";
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
import { EmployeeDrawer } from "@/components/dashboard/EmployeeDrawer";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const ACTIVITY_ICONS = { user: UserIcon, edit: Pencil, send: Send, calendar: CalIcon };

export default function Dashboard() {
  const navigate = useNavigate();
  const [campaignId, setCampaignId] = useState(CAMPAIGNS[0]?.id ?? "");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [drawerReg, setDrawerReg] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const campaign = campaignById(campaignId);
  const kpis = campaignKpis(campaign);
  const summary = departmentSummary(campaign).filter((d) => departmentFilter === "all" || d.id === departmentFilter);
  const topDates = mostRequestedDates(campaign);
  const pending = pendingEmployees(campaign).filter((e) => departmentFilter === "all" || e.departmentId === departmentFilter);
  const history = campaign ? (CAMPAIGN_HISTORY[campaign.id] ?? []) : [];

  if (!campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Visão geral das campanhas de compensação de feriados." />
        <EmptyState
          title="Nenhuma campanha cadastrada"
          description="Cadastre departamentos e crie a primeira campanha para começar."
          action={<Button onClick={() => navigate(DEPARTMENTS.length ? "/admin/campanhas/nova" : "/admin/configuracoes")}>{DEPARTMENTS.length ? "Criar campanha" : "Cadastrar departamentos"}</Button>}
        />
      </div>
    );
  }

  function copyLink() {
    const url = `${window.location.origin}/folga/${campaign.publicToken}`;
    navigator.clipboard?.writeText(url);
    toast.success("Link copiado", { description: "Link público copiado para a área de transferência." });
  }

  function openForm() {
    navigate(`/folga/${campaign.publicToken}`);
  }

  function handleTagClick(reg) {
    setDrawerReg(reg);
    setDrawerOpen(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral das campanhas de compensação de feriados.">
        <Select value={campaignId} onValueChange={setCampaignId}>
          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CAMPAIGNS.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CampaignBadge status={campaign.status} />
        <Button variant="outline" onClick={copyLink}><LinkIcon className="mr-2 h-4 w-4" /> Copiar link</Button>
        <Button onClick={openForm}><ExternalLink className="mr-2 h-4 w-4" /> Abrir formulário</Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/admin/campanhas/${campaign.id}`)}>Ver detalhes</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      {/* Status banner */}
      <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-sm">
        <CalIcon className="h-4 w-4 text-indigo-600" />
        <span className="text-indigo-900">
          {campaign.status === "Aberta" && `Campanha aberta para preenchimento até ${formatDatePT(campaign.responsePeriod.end)} às 18:00.`}
          {campaign.status === "Agendada" && `Campanha agendada — abre em ${formatDateTimePT(campaign.responsePeriod.start)}.`}
          {campaign.status === "Encerrada" && "Campanha encerrada. Os dados existentes foram preservados."}
          {campaign.status === "Rascunho" && "Esta campanha ainda é um rascunho e não está visível para os colaboradores."}
          {campaign.status === "Cancelada" && "Esta campanha foi cancelada."}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Elegíveis" value={kpis.eligible} icon={Users} accent="slate" />
        <MetricCard label="Responderam" value={kpis.responded} icon={UserCheck} accent="emerald" />
        <MetricCard label="Pendentes" value={kpis.pending} icon={UserX} accent="amber" />
        <MetricCard label="Participação" value={`${kpis.participation}%`} icon={PieChart} accent="indigo" />
        <MetricCard label="Total de escolhas" value={kpis.totalChoices} icon={CalendarCheck} accent="blue" />
        <MetricCard label="Departamentos" value={kpis.departments} icon={Building2} accent="slate" />
      </div>

      {/* Department filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Departamento:</span>
        <Tabs value={departmentFilter} onValueChange={setDepartmentFilter}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {DEPARTMENTS.map((d) => (
              <TabsTrigger key={d.id} value={d.id}>{d.name}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Calendar */}
        <div className="xl:col-span-2">
          <SectionCard title="Calendário administrativo" description="Clique em uma matrícula para abrir o colaborador.">
            <DashboardCalendar campaign={campaign} departmentFilter={departmentFilter} onTagClick={handleTagClick} />
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <SectionCard title="Resumo por departamento">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-center">Elegíveis</TableHead>
                  <TableHead className="text-center">Resp.</TableHead>
                  <TableHead className="text-center">Pend.</TableHead>
                  <TableHead className="text-center">Part.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-center">{d.eligible}</TableCell>
                    <TableCell className="text-center">{d.responded}</TableCell>
                    <TableCell className="text-center">{d.pending}</TableCell>
                    <TableCell className="text-center font-medium">{d.participation}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard title="Datas mais procuradas">
            {topDates.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Ocupação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topDates.map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium">{formatDatePT(d.date)}</TableCell>
                      <TableCell className="text-muted-foreground">{d.departments}</TableCell>
                      <TableCell className="text-center">{d.count} escolhas</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : <EmptyState title="Sem dados" description="Nenhuma escolha registrada ainda." />}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending employees */}
        <SectionCard
          title="Colaboradores pendentes"
          description={`${pending.length} ainda não responderam.`}
          action={<Button variant="link" size="sm" onClick={() => navigate(`/admin/campanhas/${campaign.id}?tab=pendentes`)}>Ver todos</Button>}
        >
          {pending.length ? (
            <div className="space-y-2">
              {pending.slice(0, 5).map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{departmentName(e.departmentId)} · Matr. {e.registration}</p>
                  </div>
                  <ResponseBadge status="Pendente" />
                </div>
              ))}
            </div>
          ) : <EmptyState title="Ninguém pendente" description="Todos os colaboradores elegíveis já responderam." />}
        </SectionCard>

        {/* Recent activity */}
        <SectionCard title="Atividade recente">
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((a) => {
              const Icon = ACTIVITY_ICONS[a.icon] ?? UserIcon;
              return (
                <div key={a.id} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <Icon className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTimePT(a.time)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Campaign history */}
      <SectionCard title="Histórico da campanha">
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

      <EmployeeDrawer
        registration={drawerReg}
        campaignId={campaign.id}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onHistory={(emp) => { setDrawerOpen(false); toast.info("Histórico aberto", { description: "O histórico detalhado está disponível na aba Histórico da campanha." }); }}
      />
    </div>
  );
}
