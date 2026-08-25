import React, { useState, useMemo } from "react";
import {
  Plus, Search, Pencil, UserX, Copy, Mail, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { EMPLOYEES, DEPARTMENTS, departmentName } from "@/lib/databaseData";
import { PageHeader, EmptyState } from "@/components/ui/common";
import { EmployeeBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { requestJson } from "@/lib/api-client";
import { ImportFlow } from "@/components/employees/ImportFlow";

export default function Employees() {
  const [employees, setEmployees] = useState(EMPLOYEES);
  const [search, setSearch] = useState("");
  const [dep, setDep] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [drawerEmp, setDrawerEmp] = useState(null);
  const [editEmp, setEditEmp] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deactivateEmp, setDeactivateEmp] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const perPage = 10;

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.registration.includes(search)) return false;
      if (dep !== "all" && e.departmentId !== dep) return false;
      if (status !== "all" && e.status !== status) return false;
      return true;
    });
  }, [employees, search, dep, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  async function saveEdit(data) {
    try {
      if (editEmp) {
        await requestJson(`/api/admin/employees/${editEmp.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            departmentId: data.departmentId,
            active: data.status === "Ativo",
          }),
        });
      } else {
        await requestJson("/api/admin/employees", {
          method: "POST",
          body: JSON.stringify({
            registration: data.registration,
            name: data.name,
            email: data.email,
            departmentId: data.departmentId,
            active: data.status === "Ativo",
          }),
        });
      }
      toast.success(editEmp ? "Colaborador atualizado" : "Colaborador criado");
      window.location.reload();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function confirmDeactivate() {
    try {
      await requestJson(`/api/admin/employees/${deactivateEmp.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: deactivateEmp.name, email: deactivateEmp.email, departmentId: deactivateEmp.departmentId, active: false }),
      });
      toast.success("Colaborador desativado");
      window.location.reload();
    } catch (error) {
      toast.error(error.message);
      setDeactivateEmp(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Colaboradores" description="Gerencie os colaboradores elegíveis para as campanhas.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} disabled={DEPARTMENTS.length === 0}><Upload className="mr-2 h-4 w-4" /> Importar XLSX</Button>
          <Button onClick={() => setCreating(true)} disabled={DEPARTMENTS.length === 0}><Plus className="mr-2 h-4 w-4" /> Novo colaborador</Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou matrícula..." className="pl-9" />
        </div>
        <Select value={dep} onValueChange={setDep}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Departamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os departamentos</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Ativo">Ativo</SelectItem>
            <SelectItem value="Inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum colaborador"
          description={employees.length === 0 ? "Cadastre o primeiro colaborador para começar." : "Nenhum colaborador corresponde aos filtros."}
          action={employees.length === 0
            ? <Button onClick={() => setCreating(true)} disabled={DEPARTMENTS.length === 0}><Plus className="mr-2 h-4 w-4" /> Novo colaborador</Button>
            : <Button onClick={() => { setSearch(""); setDep("all"); setStatus("all"); }}>Limpar filtros</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matrícula</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden sm:table-cell">Departamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => setDrawerEmp(e)}>
                  <TableCell className="font-mono text-xs">{e.registration}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.email}</TableCell>
                  <TableCell className="hidden sm:table-cell">{departmentName(e.departmentId)}</TableCell>
                  <TableCell><EmployeeBadge status={e.status} /></TableCell>
                  <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex justify-end">
                      <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard?.writeText(e.email); toast.success("E-mail copiado"); }}><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditEmp(e)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeactivateEmp(e)}><UserX className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > perPage && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{filtered.length} colaboradores</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span className="px-2">{page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <EmployeeDrawerFull emp={drawerEmp} onClose={() => setDrawerEmp(null)} onEdit={(e) => { setDrawerEmp(null); setEditEmp(e); }} />

      {/* Edit dialog */}
      {editEmp && <EditEmployeeDialog emp={editEmp} onClose={() => setEditEmp(null)} onSave={saveEdit} />}
      {creating && <EditEmployeeDialog onClose={() => setCreating(false)} onSave={saveEdit} />}

      {/* Deactivate dialog */}
      <ConfirmationDialog
        open={!!deactivateEmp}
        onOpenChange={(o) => !o && setDeactivateEmp(null)}
        title="Desativar colaborador"
        description="Este colaborador não será incluído automaticamente em novas campanhas."
        confirmLabel="Desativar"
        destructive
        onConfirm={confirmDeactivate}
      />

      <ImportFlow
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={(summary) => {
          toast.success("Importação concluída", { description: `${summary.create} criado(s) e ${summary.update} atualizado(s).` });
          window.location.reload();
        }}
      />

    </div>
  );
}

function EmployeeDrawerFull({ emp, onClose, onEdit }) {
  return (
    <Sheet open={!!emp} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-8">Colaborador</SheetTitle>
        </SheetHeader>
        {emp && (
          <div className="space-y-5 px-1">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900">{emp.name}</p>
                <p className="text-sm text-muted-foreground">Matrícula {emp.registration}</p>
              </div>
              <EmployeeBadge status={emp.status} />
            </div>
            <div className="space-y-2.5 rounded-lg border border-border bg-slate-50/60 p-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {emp.email}</div>
              <div className="text-slate-600">Departamento: {departmentName(emp.departmentId)}</div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Campanhas</p>
              <p className="text-sm text-muted-foreground">Participou de 3 campanhas (2026).</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Campanhas pendentes</p>
              <p className="text-sm text-muted-foreground">Compensação de Feriados — Novembro 2026</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Histórico administrativo</p>
              <p className="text-sm text-muted-foreground">Sem alterações administrativas.</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => onEdit(emp)}><Pencil className="mr-2 h-4 w-4" /> Editar colaborador</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditEmployeeDialog({ emp, onClose, onSave }) {
  const [registration, setRegistration] = useState(emp?.registration ?? "");
  const [name, setName] = useState(emp?.name ?? "");
  const [email, setEmail] = useState(emp?.email ?? "");
  const [departmentId, setDepartmentId] = useState(emp?.departmentId ?? DEPARTMENTS[0]?.id ?? "");
  const [status, setStatus] = useState(emp?.status ?? "Ativo");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{emp ? "Editar colaborador" : "Novo colaborador"}</DialogTitle>
          {emp && <DialogDescription>Matrícula {emp.registration} (bloqueada para edição).</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Matrícula</Label>
            <Input value={registration} onChange={(event) => setRegistration(event.target.value)} disabled={!!emp} className={emp ? "bg-slate-50" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Departamento</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!registration.trim() || !name.trim() || !email.trim() || !departmentId} onClick={() => onSave({ registration, name, email, departmentId, status })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
