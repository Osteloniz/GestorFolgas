import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CalendarPlus, Trash2, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { DEPARTMENTS, EMPLOYEES } from "@/lib/databaseData";
import { requestJson } from "@/lib/api-client";
import { PageHeader } from "@/components/ui/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Informações básicas",
  "Feriados",
  "Quantidade de folgas",
  "Período de resposta",
  "Período de folgas",
  "Regras por departamento",
  "Exceções de data",
  "Revisão",
];

const WEEKDAYS = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
const WEEKDAY_LABELS = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta", sabado: "Sábado", domingo: "Domingo" };

const EXCEPTION_TYPES = ["Bloquear data", "Liberar data", "Alterar capacidade"];

export default function CampaignWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    departmentIds: [],
    holidays: [{ date: "", name: "" }],
    leaveDaysPerEmployee: 1,
    responseStart: "",
    responseStartTime: "08:00",
    responseEnd: "",
    responseEndTime: "18:00",
    leaveStart: "",
    leaveEnd: "",
    rules: Object.fromEntries(DEPARTMENTS.map((d) => [d.id, { segunda: 0, terca: 0, quarta: 0, quinta: 0, sexta: 0, sabado: 0, domingo: 0 }])),
    exceptions: [],
  });
  const [publishOpen, setPublishOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function update(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function next() {
    if (step === 0 && (!form.name.trim() || form.departmentIds.length === 0)) {
      toast.error("Preencha o nome e selecione ao menos um departamento.");
      return;
    }
    if (step === 1 && form.holidays.some((h) => !h.date || !h.name)) {
      toast.error("Preencha data e nome de todos os feriados.");
      return;
    }
    if (step === 3 && (!form.responseStart || !form.responseEnd)) {
      toast.error("Informe o período de resposta.");
      return;
    }
    if (step === 4 && (!form.leaveStart || !form.leaveEnd)) {
      toast.error("Informe o período de folgas.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function persist(publish) {
    setSaving(true);
    try {
      await requestJson("/api/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({ ...form, publish }),
      });
      toast.success(publish ? "Campanha publicada" : "Rascunho salvo", {
        description: publish ? "O link público está disponível para os colaboradores." : "A campanha foi salva como rascunho.",
      });
      window.location.assign("/admin/campanhas");
    } catch (error) {
      toast.error(error.message);
      setSaving(false);
    }
  }

  function saveDraft() {
    persist(false);
  }

  function publish() {
    setPublishOpen(false);
    persist(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Nova campanha" description="Crie uma campanha de compensação de feriados passo a passo.">
        <Button variant="ghost" onClick={() => navigate("/admin/campanhas")}><ArrowLeft className="mr-2 h-4 w-4" /> Cancelar</Button>
      </PageHeader>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={i}>
            <button
              onClick={() => setStep(i)}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i === step ? "bg-indigo-600 text-white" : i < step ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            {i < STEPS.length - 1 && <div className={cn("h-0.5 w-6 sm:w-10", i < step ? "bg-indigo-400" : "bg-slate-200")} />}
          </React.Fragment>
        ))}
      </div>

      <Card className="border-border/60 shadow-none">
        <CardContent className="p-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-indigo-600">
            Etapa {step + 1} de {STEPS.length} · {STEPS[step]}
          </p>

          {/* Step 1 */}
          {step === 0 && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome da campanha *</Label>
                <Input id="name" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Ex.: Compensação de Feriados — Novembro 2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desc">Descrição (opcional)</Label>
                <Textarea id="desc" value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} placeholder="Descreva a campanha..." />
              </div>
              <div className="space-y-2">
                <Label>Departamentos participantes *</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {DEPARTMENTS.map((d) => {
                    const checked = form.departmentIds.includes(d.id);
                    return (
                      <label key={d.id} className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer", checked ? "border-indigo-300 bg-indigo-50" : "border-border")}>
                        <Checkbox checked={checked} onCheckedChange={(c) => {
                          update({ departmentIds: c ? [...form.departmentIds, d.id] : form.departmentIds.filter((x) => x !== d.id) });
                        }} />
                        <span className="text-sm font-medium">{d.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="mt-4 space-y-3">
              {form.holidays.map((h, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label>Data do feriado</Label>
                    <Input type="date" value={h.date} onChange={(e) => {
                      const holidays = [...form.holidays]; holidays[i] = { ...h, date: e.target.value }; update({ holidays });
                    }} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Nome do feriado</Label>
                    <Input value={h.name} onChange={(e) => {
                      const holidays = [...form.holidays]; holidays[i] = { ...h, name: e.target.value }; update({ holidays });
                    }} placeholder="Ex.: Finados" />
                  </div>
                  {form.holidays.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => update({ holidays: form.holidays.filter((_, idx) => idx !== i) })}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => update({ holidays: [...form.holidays, { date: "", name: "" }] })}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar feriado
              </Button>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label>Quantidade de folgas permitidas por colaborador</Label>
                <Input type="number" min={1} value={form.leaveDaysPerEmployee} onChange={(e) => update({ leaveDaysPerEmployee: Math.max(1, Number(e.target.value)) })} className="w-32" />
              </div>
              <div className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                <CalendarPlus className="mr-1.5 inline h-4 w-4" />
                {form.holidays.filter((h) => h.date).length} feriado(s) cadastrado(s). Sugestão: permitir {form.holidays.filter((h) => h.date).length} dia(s) de folga.
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 3 && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Data de início</Label>
                  <Input type="date" value={form.responseStart} onChange={(e) => update({ responseStart: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora de início</Label>
                  <Input type="time" value={form.responseStartTime} onChange={(e) => update({ responseStartTime: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de encerramento</Label>
                  <Input type="date" value={form.responseEnd} onChange={(e) => update({ responseEnd: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Hora de encerramento</Label>
                  <Input type="time" value={form.responseEndTime} onChange={(e) => update({ responseEndTime: e.target.value })} />
                </div>
              </div>
              {form.responseStart && form.responseEnd && (
                <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  A campanha estará aberta de <strong>{form.responseStart} às {form.responseStartTime}</strong> até <strong>{form.responseEnd} às {form.responseEndTime}</strong>.
                </div>
              )}
            </div>
          )}

          {/* Step 5 */}
          {step === 4 && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Primeira data permitida</Label>
                  <Input type="date" value={form.leaveStart} onChange={(e) => update({ leaveStart: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Última data permitida</Label>
                  <Input type="date" value={form.leaveEnd} onChange={(e) => update({ leaveEnd: e.target.value })} />
                </div>
              </div>
              {form.leaveStart && form.leaveEnd && (
                <div className="rounded-lg border border-dashed border-border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Período de folgas: {form.leaveStart} até {form.leaveEnd}
                </div>
              )}
            </div>
          )}

          {/* Step 6 */}
          {step === 5 && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const source = form.departmentIds[0];
                  if (!source) return;
                  const copied = form.rules[source];
                  update({ rules: Object.fromEntries(form.departmentIds.map((d) => [d, { ...copied }])) });
                  toast.success("Regras aplicadas a todos os departamentos");
                }}><Copy className="mr-1.5 h-3.5 w-3.5" /> Aplicar a todos</Button>
              </div>
              {form.departmentIds.map((depId) => (
                <div key={depId} className="rounded-lg border border-border p-4">
                  <p className="mb-3 text-sm font-semibold uppercase text-slate-700">{DEPARTMENTS.find((d) => d.id === depId)?.name}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {WEEKDAYS.map((day) => {
                      const rules = form.rules[depId] || {};
                      const active = (rules[day] ?? 0) > 0;
                      return (
                        <div key={day} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={active} onCheckedChange={(c) => update({ rules: { ...form.rules, [depId]: { ...rules, [day]: c ? 2 : 0 } } })} />
                            <span className="text-sm font-medium">{WEEKDAY_LABELS[day]}</span>
                          </div>
                          {active && (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">Capacidade</span>
                              <Input type="number" min={0} value={rules[day]} onChange={(e) => update({ rules: { ...form.rules, [depId]: { ...rules, [day]: Math.max(0, Number(e.target.value)) } } })} className="h-8 w-16" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 7 */}
          {step === 6 && (
            <div className="mt-4 space-y-4">
              <ExceptionEditor form={form} update={update} />
            </div>
          )}

          {/* Step 8 - Review */}
          {step === 7 && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-border divide-y">
                <ReviewRow label="Nome" value={form.name || "—"} />
                <ReviewRow label="Descrição" value={form.description || "—"} />
                <ReviewRow label="Feriados" value={form.holidays.filter((h) => h.date).map((h) => `${h.date} (${h.name})`).join(", ") || "—"} />
                <ReviewRow label="Folgas por colaborador" value={form.leaveDaysPerEmployee} />
                <ReviewRow label="Período de resposta" value={form.responseStart ? `${form.responseStart} ${form.responseStartTime} — ${form.responseEnd} ${form.responseEndTime}` : "—"} />
                <ReviewRow label="Período de folgas" value={form.leaveStart ? `${form.leaveStart} — ${form.leaveEnd}` : "—"} />
                <ReviewRow label="Departamentos" value={form.departmentIds.map((d) => DEPARTMENTS.find((x) => x.id === d)?.name).join(", ") || "—"} />
                <ReviewRow label="Exceções" value={form.exceptions.length ? `${form.exceptions.length} exceção(ões)` : "Nenhuma"} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={saveDraft} disabled={saving}>Salvar rascunho</Button>
                <Button onClick={() => setPublishOpen(true)} disabled={saving}>Publicar campanha</Button>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < STEPS.length - 1 && (
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => (step === 0 ? navigate("/admin/campanhas") : setStep((s) => s - 1))}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {step === 0 ? "Cancelar" : "Voltar"}
              </Button>
              <Button onClick={next}>
                Próximo <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish confirmation */}
      {publishOpen && (
        <PublishDialog form={form} onClose={() => setPublishOpen(false)} onConfirm={publish} />
      )}
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-slate-900 sm:text-right">{value}</span>
    </div>
  );
}

function ExceptionEditor({ form, update }) {
  function addExc() {
    update({ exceptions: [...form.exceptions, { id: `exc-${Date.now()}`, departmentId: form.departmentIds[0] || "", date: "", type: "Bloquear data", capacity: 0, note: "" }] });
  }
  function updateExc(i, patch) {
    const exceptions = form.exceptions.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    update({ exceptions });
  }
  return (
    <>
      {form.exceptions.map((exc, i) => (
        <div key={exc.id} className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Departamento</Label>
            <Select value={exc.departmentId} onValueChange={(v) => updateExc(i, { departmentId: v })}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>{form.departmentIds.map((d) => <SelectItem key={d} value={d}>{DEPARTMENTS.find((x) => x.id === d)?.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Input type="date" value={exc.date} onChange={(e) => updateExc(i, { date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de exceção</Label>
            <Select value={exc.type} onValueChange={(v) => updateExc(i, { type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXCEPTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {exc.type === "Alterar capacidade" && (
            <div className="space-y-1.5">
              <Label>Capacidade</Label>
              <Input type="number" min={0} value={exc.capacity} onChange={(e) => updateExc(i, { capacity: Number(e.target.value) })} />
            </div>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observação (opcional)</Label>
            <Input value={exc.note} onChange={(e) => updateExc(i, { note: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => update({ exceptions: form.exceptions.filter((_, idx) => idx !== i) })}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover exceção
            </Button>
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addExc}><Plus className="mr-2 h-4 w-4" /> Adicionar exceção</Button>
    </>
  );
}

function PublishDialog({ form, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Publicar campanha</h3>
        <p className="mt-1 text-sm text-muted-foreground">Confirme as informações antes de publicar.</p>
        <div className="mt-4 space-y-2 rounded-lg border border-border p-4 text-sm">
          <ReviewRow label="Abertura" value={`${form.responseStart} ${form.responseStartTime}`} />
          <ReviewRow label="Encerramento" value={`${form.responseEnd} ${form.responseEndTime}`} />
          <ReviewRow label="Colaboradores elegíveis" value={EMPLOYEES.filter((employee) => employee.status === "Ativo" && form.departmentIds.includes(employee.departmentId)).length} />
          <ReviewRow label="Departamentos" value={form.departmentIds.length} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onConfirm}>Publicar</Button>
        </div>
      </div>
    </div>
  );
}
