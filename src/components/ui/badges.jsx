import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Circle, UserCheck, Edit3 } from "lucide-react";

const CAMPAIGN_STYLES = {
  Rascunho: "bg-slate-100 text-slate-600 border-slate-200",
  Agendada: "bg-blue-50 text-blue-700 border-blue-200",
  Aberta: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Encerrada: "bg-amber-50 text-amber-700 border-amber-200",
  Cancelada: "bg-rose-50 text-rose-700 border-rose-200",
};

const EMPLOYEE_STYLES = {
  Ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Inativo: "bg-slate-100 text-slate-500 border-slate-200",
};

const RESPONSE_STYLES = {
  Respondido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Pendente: "bg-amber-50 text-amber-700 border-amber-200",
  "Alterado pelo gestor": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function CampaignBadge({ status, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", CAMPAIGN_STYLES[status] ?? CAMPAIGN_STYLES.Rascunho, className)}>
      {status}
    </span>
  );
}

export function EmployeeBadge({ status, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", EMPLOYEE_STYLES[status] ?? EMPLOYEE_STYLES.Ativo, className)}>
      {status === "Ativo" ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {status}
    </span>
  );
}

export function ResponseBadge({ status, className }) {
  const Icon = status === "Respondido" ? CheckCircle2 : status === "Pendente" ? Clock : Edit3;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", RESPONSE_STYLES[status] ?? RESPONSE_STYLES.Pendente, className)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

const CAPACITY_CONFIG = {
  Disponível: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "Quase lotado": { icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  Lotado: { icon: XCircle, cls: "bg-rose-50 text-rose-700 border-rose-200" },
  Excedido: { icon: AlertTriangle, cls: "bg-red-100 text-red-800 border-red-300" },
  Indisponível: { icon: XCircle, cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

export function CapacityBadge({ status, className }) {
  const cfg = CAPACITY_CONFIG[status] ?? CAPACITY_CONFIG.Disponível;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.cls, className)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export function UserCheckBadge() {
  return <UserCheck className="h-4 w-4 text-emerald-600" />;
}