import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Copy, ExternalLink, MoreHorizontal, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { CAMPAIGNS, DEPARTMENTS, formatDatePT, departmentName } from "@/lib/databaseData";
import { PageHeader, EmptyState } from "@/components/ui/common";
import { CampaignBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_OPTIONS = ["Todos", "Rascunho", "Agendada", "Aberta", "Encerrada", "Cancelada"];

export default function Campaigns() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Todos");
  const [year, setYear] = useState("Todos");
  const [month, setMonth] = useState("Todos");

  const filtered = useMemo(() => {
    return CAMPAIGNS.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== "Todos" && c.status !== status) return false;
      if (year !== "Todos" && !c.leavePeriod.start.startsWith(year)) return false;
      if (month !== "Todos") {
        const m = String(new Date(c.leavePeriod.start + "T00:00:00").getMonth() + 1).padStart(2, "0");
        if (m !== month) return false;
      }
      return true;
    });
  }, [search, status, year, month]);

  function copyLink(c) {
    navigator.clipboard?.writeText(`${window.location.origin}/folga/${c.publicToken}`);
    toast.success("Link copiado");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Campanhas" description="Gerencie as campanhas de compensação de feriados.">
        <Button onClick={() => navigate(DEPARTMENTS.length ? "/admin/campanhas/nova" : "/admin/configuracoes")}>
          <Plus className="mr-2 h-4 w-4" /> Nova campanha
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar campanhas..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Ano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Ano</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Mês</SelectItem>
            {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && CAMPAIGNS.length === 0 ? (
        <EmptyState
          title="Nenhuma campanha"
          description="Crie sua primeira campanha de compensação."
          icon={CalendarRange}
          action={<Button onClick={() => navigate(DEPARTMENTS.length ? "/admin/campanhas/nova" : "/admin/configuracoes")}><Plus className="mr-2 h-4 w-4" /> {DEPARTMENTS.length ? "Nova campanha" : "Cadastrar departamentos"}</Button>}
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum resultado" description="Ajuste os filtros para encontrar campanhas." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campanha</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Feriados</TableHead>
                <TableHead className="hidden lg:table-cell">Período de resposta</TableHead>
                <TableHead className="hidden lg:table-cell">Folgas</TableHead>
                <TableHead className="hidden xl:table-cell">Departamentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/admin/campanhas/${c.id}`)}>
                  <TableCell>
                    <p className="font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.holidays.length} feriado(s) · {c.leaveDaysPerEmployee} folga(s) por colaborador</p>
                  </TableCell>
                  <TableCell><CampaignBadge status={c.status} /></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.holidays.map((h) => formatDatePT(h.date)).join(", ")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDatePT(c.responsePeriod.start)} — {formatDatePT(c.responsePeriod.end)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {formatDatePT(c.leavePeriod.start)} — {formatDatePT(c.leavePeriod.end)}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                    {c.departmentIds.map((d) => departmentName(d)).join(", ")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyLink(c)} title="Copiar link"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/folga/${c.publicToken}`)} title="Abrir formulário"><ExternalLink className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/campanhas/${c.id}`)}>Abrir dashboard</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(c)}><Copy className="mr-2 h-4 w-4" /> Copiar link</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
