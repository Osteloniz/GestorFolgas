import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CapacityBadge } from "@/components/ui/badges";
import { calendarData, PT_MONTHS, PT_WEEKDAYS_SHORT } from "@/lib/databaseData";

const STATE_STYLES = {
  Disponível: "bg-white hover:border-indigo-300",
  "Quase lotado": "bg-amber-50/60 hover:border-amber-300",
  Lotado: "bg-rose-50/60 hover:border-rose-300",
  Excedido: "bg-red-100/70 hover:border-red-400",
  Indisponível: "bg-slate-50 text-slate-400",
};

export function DashboardCalendar({ campaign, departmentFilter, onTagClick }) {
  const data = useMemo(
    () => calendarData(campaign, departmentFilter),
    [campaign, departmentFilter]
  );
  const [cursor, setCursor] = useState(() => {
    const start = new Date(campaign.leavePeriod.start + "T00:00:00");
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function inLeavePeriod(day) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return !!data[iso];
  }

  function isoFor(day) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            {PT_MONTHS[month]} {year}
          </h3>
          <span className="text-sm text-muted-foreground">Calendário de folgas</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {PT_WEEKDAYS_SHORT.map((d) => (
          <div key={d} className="pb-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const iso = isoFor(day);
          const info = data[iso];
          if (!info) {
            return (
              <div key={iso} className="min-h-[92px] rounded-lg border border-transparent bg-slate-50/50 p-2 text-xs text-slate-300">
                {day}
              </div>
            );
          }
          const isUnavailable = info.status === "Indisponível";
          return (
            <div
              key={iso}
              className={cn(
                "min-h-[92px] rounded-lg border p-2 transition-colors",
                STATE_STYLES[info.status]
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-semibold", isUnavailable ? "text-slate-400" : "text-slate-700")}>
                  {day}
                </span>
                <span className={cn("text-[10px] font-medium", isUnavailable ? "text-slate-400" : "text-slate-500")}>
                  {info.used}/{info.capacity}
                </span>
              </div>
              {!isUnavailable && (
                <div className="mt-1.5 space-y-1">
                  {info.registrations.slice(0, 2).map((reg) => (
                    <button
                      key={reg}
                      onClick={() => onTagClick?.(reg)}
                      className="block w-full rounded bg-white/80 px-1.5 py-0.5 text-left text-[10px] font-medium text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50"
                    >
                      {reg}
                    </button>
                  ))}
                  {info.registrations.length > 2 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
                      <Plus className="h-2.5 w-2.5" /> {info.registrations.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Legenda:</span>
        <CapacityBadge status="Disponível" />
        <CapacityBadge status="Quase lotado" />
        <CapacityBadge status="Lotado" />
        <CapacityBadge status="Excedido" />
        <CapacityBadge status="Indisponível" />
      </div>
    </div>
  );
}
