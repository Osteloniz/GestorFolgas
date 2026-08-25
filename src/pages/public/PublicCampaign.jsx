import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ShieldCheck, Loader2, AlertCircle, ArrowRight, ArrowLeft, Check, CalendarDays, Clock, XCircle, Lock,
} from "lucide-react";
import { formatDatePT, formatDateTimePT, PT_MONTHS, SETTINGS } from "@/lib/databaseData";
import { requestJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CapacityBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

export default function PublicCampaign() {
  const { token } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [campaignError, setCampaignError] = useState("");

  // Stage: landing -> validate -> calendar -> review -> submitting -> success
  const [stage, setStage] = useState("landing");
  const [reg, setReg] = useState("");
  const [validationError, setValidationError] = useState("");
  const [validating, setValidating] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [selected, setSelected] = useState([]);
  const [justification, setJustification] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState("");
  const [conflict, setConflict] = useState(false);
  const [calendar, setCalendar] = useState({});
  const [publicSession, setPublicSession] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoadingCampaign(true);
    fetch(`/api/public/campaigns/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Campanha não encontrada.");
        return response.json();
      })
      .then((data) => { if (!cancelled) setCampaign(data); })
      .catch((error) => { if (!cancelled) setCampaignError(error.message); })
      .finally(() => { if (!cancelled) setLoadingCampaign(false); });
    return () => { cancelled = true; };
  }, [token]);

  if (loadingCampaign) {
    return <PublicShell><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div></PublicShell>;
  }

  if (!campaign) {
    return <PublicShell><InvalidCampaign message={campaignError} /></PublicShell>;
  }

  if (campaign.status === "Cancelada") {
    return <PublicShell><CancelledState contact={SETTINGS.publicForm.managerContact} /></PublicShell>;
  }
  if (campaign.status === "Encerrada") {
    return <PublicShell><ClosedState /></PublicShell>;
  }
  if (campaign.status === "Agendada") {
    return <PublicShell><ScheduledState openAt={campaign.responsePeriod.start} /></PublicShell>;
  }
  if (campaign.status === "Rascunho") {
    return <PublicShell><InvalidCampaign message="Esta campanha ainda não está publicada." /></PublicShell>;
  }

  async function validate() {
    setValidationError("");
    setValidating(true);
    try {
      const result = await requestJson(`/api/public/campaigns/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ action: "validate", registration: reg }),
      });
      setEmployee(result.employee);
      setCalendar(result.calendar);
      setPublicSession(result.publicSession);
      setStage("calendar");
    } catch (error) {
      setValidationError(error.message);
    } finally {
      setValidating(false);
    }
  }

  function toggleDate(iso) {
    setConflict(false);
    setSelected((prev) => {
      if (prev.includes(iso)) return prev.filter((d) => d !== iso);
      if (prev.length >= campaign.leaveDaysPerEmployee) return prev;
      return [...prev, iso];
    });
  }

  async function confirmSubmit() {
    setSubmitting(true);
    setConflict(false);
    try {
      const result = await requestJson(`/api/public/campaigns/${encodeURIComponent(token)}`, {
        method: "POST",
        body: JSON.stringify({ action: "submit", publicSession, dates: selected, justification }),
      });
      setSubmittedAt(result.submittedAt);
      setStage("success");
    } catch (error) {
      setConflict(true);
      setValidationError(error.message);
      if (error.conflictDate) setSelected((previous) => previous.filter((date) => date !== error.conflictDate));
      setStage("calendar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicShell>
      {stage === "landing" && (
        <Landing
          campaign={campaign}
          reg={reg}
          setReg={setReg}
          validate={validate}
          validating={validating}
          error={validationError}
        />
      )}

      {stage === "calendar" && employee && (
        <CalendarStage
          campaign={campaign}
          employee={employee}
          calData={calendar}
          selected={selected}
          toggleDate={toggleDate}
          justification={justification}
          setJustification={setJustification}
          conflict={conflict}
          onBack={() => { setStage("landing"); setEmployee(null); setSelected([]); }}
          onReview={() => setStage("review")}
        />
      )}

      {stage === "review" && employee && (
        <ReviewStage
          campaign={campaign}
          employee={employee}
          selected={selected}
          justification={justification}
          onBack={() => setStage("calendar")}
          onConfirm={confirmSubmit}
          submitting={submitting}
        />
      )}

      {stage === "success" && employee && (
        <SuccessStage
          campaign={campaign}
          employee={employee}
          selected={selected}
          submittedAt={submittedAt}
        />
      )}
    </PublicShell>
  );
}

function PublicShell({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-md px-4 py-8">{children}</div>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
        <ShieldCheck className="h-5 w-5" />
      </div>
      <h1 className="mt-4 text-lg font-semibold text-slate-900">Gestão de Compensações</h1>
    </div>
  );
}

function Landing({ campaign, reg, setReg, validate, validating, error }) {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{campaign.name}</h2>
        {campaign.description && <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>}

        <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-medium text-slate-700">Feriados</p>{campaign.holidays.map((h) => <p key={h.date} className="text-muted-foreground">{formatDatePT(h.date)} — {h.name}</p>)}</div></div>
          <div className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="font-medium text-slate-700">Período de resposta</p><p className="text-muted-foreground">{formatDatePT(campaign.responsePeriod.start)} até {formatDatePT(campaign.responsePeriod.end)}</p></div></div>
        </div>

        <div className="mt-5 space-y-2">
          <Label htmlFor="reg">Matrícula</Label>
          <Input id="reg" value={reg} onChange={(e) => { setReg(e.target.value.replace(/\D/g, "")); }} inputMode="numeric" placeholder="Informe sua matrícula" />
          <p className="text-xs text-muted-foreground">Apenas colaboradores cadastrados podem responder.</p>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <Button className="mt-4 w-full" onClick={validate} disabled={validating || !reg}>
          {validating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {validating ? "Validando..." : "Continuar"}
        </Button>

        <p className="mt-4 text-center text-xs text-muted-foreground">Dúvidas? Contate seu gestor: {SETTINGS.publicForm.managerContact}</p>
      </div>
    </div>
  );
}

function CalendarStage({ campaign, employee, calData, selected, toggleDate, justification, setJustification, conflict, onBack, onReview }) {
  const dates = Object.keys(calData).sort();
  // Group by month
  const byMonth = {};
  dates.forEach((iso) => {
    const d = new Date(iso + "T00:00:00");
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth[key] = byMonth[key] || { month: d.getMonth(), year: d.getFullYear(), days: [] };
    byMonth[key].days.push(iso);
  });

  return (
    <div>
      <Brand />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{campaign.name}</p>
          <p className="text-xs text-muted-foreground">{employee.name} · {employee.departmentName}</p>
        </div>
        <button onClick={onBack} className="text-sm text-indigo-600">Sair</button>
      </div>

      <div className="mb-4 rounded-lg bg-indigo-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-indigo-900">Escolha {campaign.leaveDaysPerEmployee} {campaign.leaveDaysPerEmployee > 1 ? "dias" : "dia"}</p>
        <p className="text-xs text-indigo-700">{selected.length} de {campaign.leaveDaysPerEmployee} selecionado(s)</p>
      </div>

      {conflict && (
        <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-medium">Uma das datas selecionadas não está mais disponível.</p>
          <p>Revise as escolhas e tente novamente.</p>
        </div>
      )}

      <div className="space-y-6">
        {Object.values(byMonth).map((m) => (
          <div key={`${m.month}-${m.year}`}>
            <p className="mb-2 text-sm font-semibold text-slate-700">{PT_MONTHS[m.month]} {m.year}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {m.days.map((iso) => {
                const info = calData[iso];
                const d = new Date(iso + "T00:00:00");
                const isSel = selected.includes(iso);
                const unavailable = info.status === "Indisponível";
                const full = info.status === "Lotado" || info.status === "Excedido";
                const disabled = unavailable || full;
                return (
                  <button
                    key={iso}
                    onClick={() => !disabled && toggleDate(iso)}
                    disabled={disabled}
                    className={cn(
                      "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors",
                      isSel && "border-indigo-600 bg-indigo-600 text-white",
                      !isSel && unavailable && "border-transparent bg-slate-100 text-slate-300",
                      !isSel && full && "border-rose-200 bg-rose-50 text-rose-400",
                      !isSel && !disabled && "border-border bg-white text-slate-700 hover:border-indigo-300",
                    )}
                  >
                    <span className="font-semibold">{d.getDate()}</span>
                    {SETTINGS.publicForm.showNumericCapacity && !isSel && !unavailable && (
                      <span className="text-[9px]">{info.used}/{info.capacity}</span>
                    )}
                    {isSel && <Check className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2">
        <CapacityBadge status="Disponível" />
        <CapacityBadge status="Quase lotado" />
        <CapacityBadge status="Lotado" />
        <CapacityBadge status="Indisponível" />
      </div>

      {/* Selected summary */}
      <div className="mt-5 rounded-xl border border-border bg-white p-4">
        <p className="mb-2 text-sm font-medium">Suas escolhas</p>
        {selected.length ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((d) => (
              <span key={d} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700">{formatDatePT(d)}</span>
            ))}
          </div>
        ) : <p className="text-sm text-muted-foreground">Nenhuma data selecionada.</p>}
      </div>

      {/* Justification */}
      <div className="mt-4 space-y-1.5">
        <Label>Justificativa</Label>
        <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} placeholder="A justificativa é opcional." />
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        <Button className="flex-1" disabled={selected.length !== campaign.leaveDaysPerEmployee} onClick={onReview}>
          Revisar <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStage({ campaign, employee, selected, justification, onBack, onConfirm, submitting }) {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Revise sua escolha</h2>
        <p className="mt-1 text-sm text-muted-foreground">Confirme os dados antes de enviar. Após a confirmação, não será possível editar.</p>

        <div className="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          <Row label="Nome" value={employee.name} />
          <Row label="Matrícula" value={employee.registration} />
          <Row label="Departamento" value={employee.departmentName} />
          <Row label="Campanha" value={campaign.name} />
          <div>
            <p className="text-muted-foreground">Datas selecionadas</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {selected.map((d) => <span key={d} className="rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-700">{formatDatePT(d)}</span>)}
            </div>
          </div>
          <Row label="Justificativa" value={justification || "Não informada"} />
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? "Enviando..." : "Confirmar escolha"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuccessStage({ campaign, employee, selected, submittedAt }) {
  const masked = employee.email.replace(/^(.{2}).+(@.+)/, "$1***$2");
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <Check className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Escolha registrada com sucesso.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Caso precise de alguma alteração, procure seu gestor.</p>

        <div className="mt-5 space-y-2 rounded-lg bg-slate-50 p-4 text-left text-sm">
          <Row label="Campanha" value={campaign.name} />
          <div>
            <p className="text-muted-foreground">Datas selecionadas</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {selected.map((d) => <span key={d} className="rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-700">{formatDatePT(d)}</span>)}
            </div>
          </div>
          <Row label="Matrícula" value={employee.registration} />
          <Row label="Departamento" value={employee.departmentName} />
          <Row label="Enviado em" value={formatDateTimePT(submittedAt)} />
          {SETTINGS.publicForm.showMaskedEmail && <Row label="E-mail" value={masked} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

function InvalidCampaign({ message }) {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50">
          <AlertCircle className="h-7 w-7 text-rose-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">{message || "Campanha não encontrada ou link inválido."}</h2>
      </div>
    </div>
  );
}

function ClosedState() {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Lock className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">O período de escolha foi encerrado.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Não é mais possível responder. Em caso de dúvida, procure seu gestor.</p>
      </div>
    </div>
  );
}

function ScheduledState({ openAt }) {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
          <Clock className="h-7 w-7 text-blue-600" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Esta campanha ainda não está disponível para preenchimento.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Abertura em {formatDateTimePT(openAt)}.</p>
      </div>
    </div>
  );
}

function CancelledState({ contact }) {
  return (
    <div>
      <Brand />
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <XCircle className="h-7 w-7 text-slate-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Esta campanha foi cancelada pelo gestor.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Em caso de dúvida, entre em contato: {contact}</p>
      </div>
    </div>
  );
}
