import React from "react";
import { Mail, Building2, CalendarDays, Clock, FileText, History } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmployeeBadge, ResponseBadge } from "@/components/ui/badges";
import {
  employeeByRegistration,
  departmentName,
  submissionsForCampaign,
  formatDatePT,
  formatDateTimePT,
  employeeHistory,
  campaignById,
} from "@/lib/databaseData";

export function EmployeeDrawer({ registration, campaignId, open, onOpenChange, onEdit, onAdd, onRemove, onHistory }) {
  const emp = registration ? employeeByRegistration(registration) : null;
  const campaign = campaignById(campaignId);
  const submission = emp && campaignId ? submissionsForCampaign(campaignId).find((s) => s.employeeId === emp.id) : null;
  const history = emp ? employeeHistory(emp.id) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader className="text-left">
          <SheetTitle className="pr-8">Colaborador</SheetTitle>
        </SheetHeader>
        {emp ? (
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
              <div className="flex items-center gap-2 text-slate-600"><Building2 className="h-4 w-4 text-slate-400" /> {departmentName(emp.departmentId)}</div>
              <div className="flex items-center gap-2 text-slate-600"><CalendarDays className="h-4 w-4 text-slate-400" /> {campaign?.name ?? "—"}</div>
              {submission && (
                <div className="flex items-center gap-2 text-slate-600"><Clock className="h-4 w-4 text-slate-400" /> Enviado em {formatDateTimePT(submission.submittedAt)}</div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Datas selecionadas</p>
              {submission?.dates?.length ? (
                <div className="flex flex-wrap gap-2">
                  {submission.dates.map((d) => (
                    <span key={d} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700">
                      {formatDatePT(d)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma data selecionada.</p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Justificativa</p>
              <div className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-slate-600">
                <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                {submission?.justification || "Sem justificativa informada."}
              </div>
            </div>

            {submission && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Status da resposta</p>
                <ResponseBadge status={submission.status} />
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-slate-900">Histórico administrativo</p>
              <div className="space-y-3">
                {history.length ? history.map((h) => (
                  <div key={h.id} className="relative pl-5">
                    <div className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                    <div className="absolute left-[3px] top-3.5 h-full w-px bg-border" />
                    <p className="text-sm text-slate-700">{h.text}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTimePT(h.at)}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Sem histórico.</p>}
              </div>
            </div>

            <Separator />

            {onHistory && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => onHistory(emp)}>
                <History className="mr-1.5 h-3.5 w-3.5" /> Ver histórico
              </Button>
            )}
          </div>
        ) : (
          <p className="px-1 text-sm text-muted-foreground">Colaborador não encontrado.</p>
        )}
      </SheetContent>
    </Sheet>
  );
}
