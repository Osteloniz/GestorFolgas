import React, { useState, useMemo } from "react";
import { Download, FileBarChart, Search } from "lucide-react";
import { toast } from "sonner";
import {
  CAMPAIGNS, campaignById, submissionsForCampaign, employeeById,
  departmentName, DEPARTMENTS, formatDatePT, formatDateTimePT,
} from "@/lib/databaseData";
import { PageHeader, MetricCard, SectionCard, EmptyState } from "@/components/ui/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, UserCheck, CalendarCheck, Building2, PieChart } from "lucide-react";

export default function Reports() {
  const [campaignId, setCampaignId] = useState("");
  const [dep, setDep] = useState("all");
  const [period, setPeriod] = useState("all");
  const [leaveDate, setLeaveDate] = useState("all");
  const [status, setStatus] = useState("all");
  const [justif, setJustif] = useState("all");
  const [search, setSearch] = useState("");

  const campaign = campaignId ? campaignById(campaignId) : null;
  const subs = campaign ? submissionsForCampaign(campaign.id) : [];

  const rows = useMemo(() => {
    if (!campaign) return [];
    return subs
      .map((s) => {
        const emp = employeeById(s.employeeId);
        return { ...s, emp };
      })
      .filter((r) => {
        if (!r.emp) return false;
        if (dep !== "all" && r.emp.departmentId !== dep) return false;
        if (leaveDate !== "all" && !r.dates.includes(leaveDate)) return false;
        if (status !== "all" && r.status !== status) return false;
        if (justif === "com" && !r.justification) return false;
        if (justif === "sem" && r.justification) return false;
        if (search && !r.emp.name.toLowerCase().includes(search.toLowerCase()) && !r.emp.registration.includes(search)) return false;
        return true;
      })
      .flatMap((r) => r.dates.map((d) => ({
        registration: r.emp.registration,
        name: r.emp.name,
        email: r.emp.email,
        department: departmentName(r.emp.departmentId),
        date: d,
        justification: r.justification,
        submittedAt: r.submittedAt,
      })));
  }, [campaign, subs, dep, leaveDate, status, justif, search]);

  const kpis = {
    responses: subs.length,
    choices: rows.length,
    employees: new Set(subs.map((s) => s.employeeId)).size,
    departments: new Set(subs.map((s) => employeeById(s.employeeId)?.departmentId)).size,
    participation: campaign ? Math.round((subs.length / 30) * 100) : 0,
  };

  function exportXlsx() {
    toast.success("Exportando XLSX", { description: `${rows.length} registros serão baixados.` });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Analise as respostas e escolhas das campanhas.">
        <Button variant="outline" onClick={exportXlsx} disabled={!campaign}>
          <Download className="mr-2 h-4 w-4" /> Exportar XLSX
        </Button>
      </PageHeader>

      {/* Filters */}
      <SectionCard title="Filtros">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Campanha</label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue placeholder="Selecione uma campanha" /></SelectTrigger>
              <SelectContent>{CAMPAIGNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Departamento</label>
            <Select value={dep} onValueChange={setDep} disabled={!campaign}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Período</label>
            <Select value={period} onValueChange={setPeriod} disabled={!campaign}>
              <SelectTrigger><SelectValue placeholder="Todo o período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o período</SelectItem>
                <SelectItem value="2026-11">Novembro 2026</SelectItem>
                <SelectItem value="2026-10">Outubro 2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data de folga</label>
            <Select value={leaveDate} onValueChange={setLeaveDate} disabled={!campaign}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="2026-11-05">05/11/2026</SelectItem>
                <SelectItem value="2026-11-15">15/11/2026</SelectItem>
                <SelectItem value="2026-11-18">18/11/2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status da resposta</label>
            <Select value={status} onValueChange={setStatus} disabled={!campaign}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Respondido">Respondido</SelectItem>
                <SelectItem value="Alterado pelo gestor">Alterado pelo gestor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Justificativa</label>
            <Select value={justif} onValueChange={setJustif} disabled={!campaign}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="com">Com justificativa</SelectItem>
                <SelectItem value="sem">Sem justificativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 lg:col-span-3">
            <label className="text-sm font-medium">Buscar por matrícula ou nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" disabled={!campaign} />
            </div>
          </div>
        </div>
      </SectionCard>

      {!campaign ? (
        <EmptyState title="Selecione uma campanha" description="Selecione uma campanha para visualizar os dados." icon={FileBarChart} />
      ) : rows.length === 0 ? (
        <EmptyState title="Nenhum registro encontrado" description="Nenhum registro encontrado para os filtros selecionados." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard label="Total de respostas" value={kpis.responses} icon={Users} accent="slate" />
            <MetricCard label="Total de escolhas" value={kpis.choices} icon={CalendarCheck} accent="blue" />
            <MetricCard label="Colaboradores" value={kpis.employees} icon={UserCheck} accent="emerald" />
            <MetricCard label="Departamentos" value={kpis.departments} icon={Building2} accent="slate" />
            <MetricCard label="Participação" value={`${kpis.participation}%`} icon={PieChart} accent="indigo" />
          </div>

          <SectionCard title="Pré-visualização" description={`${rows.length} registros.`}>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead className="hidden sm:table-cell">Departamento</TableHead>
                    <TableHead>Data de folga</TableHead>
                    <TableHead className="hidden lg:table-cell">Justificativa</TableHead>
                    <TableHead className="hidden md:table-cell">Enviado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{r.registration}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">{r.department}</TableCell>
                      <TableCell>{formatDatePT(r.date)}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate text-muted-foreground">{r.justification || "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{formatDateTimePT(r.submittedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
