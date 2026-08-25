// Adaptador temporário para o protótipo legado. Os dados são carregados do
// PostgreSQL pela API administrativa antes das rotas protegidas renderizarem.

export let DEPARTMENTS = [];
export let EMPLOYEES = [];
export let CAMPAIGNS = [];
export let SUBMISSIONS = [];
export let RECENT_ACTIVITY = [];
export let CAMPAIGN_HISTORY = {};
let ELIGIBILITY = [];

export function configureDatabaseData(data) {
  DEPARTMENTS = Array.isArray(data?.departments) ? data.departments : [];
  EMPLOYEES = Array.isArray(data?.employees) ? data.employees : [];
  CAMPAIGNS = Array.isArray(data?.campaigns) ? data.campaigns : [];
  SUBMISSIONS = Array.isArray(data?.submissions) ? data.submissions : [];
  ELIGIBILITY = Array.isArray(data?.eligibility) ? data.eligibility : [];
  RECENT_ACTIVITY = Array.isArray(data?.recentActivity) ? data.recentActivity : [];
  CAMPAIGN_HISTORY = data?.campaignHistory && typeof data.campaignHistory === "object"
    ? data.campaignHistory
    : {};
}

export function departmentName(id) {
  return DEPARTMENTS.find((department) => department.id === id)?.name ?? "—";
}

export function campaignById(id) {
  return CAMPAIGNS.find((campaign) => campaign.id === id);
}

export function campaignByToken(token) {
  return CAMPAIGNS.find((campaign) => campaign.publicToken === token);
}

export function submissionsForCampaign(campaignId) {
  return SUBMISSIONS.filter((submission) => submission.campaignId === campaignId);
}

export function employeeById(id) {
  return EMPLOYEES.find((employee) => employee.id === id);
}

export function employeeByRegistration(registration) {
  return EMPLOYEES.find(
    (employee) => employee.registration === String(registration).trim(),
  );
}

export function respondedEmployeeIds(campaignId) {
  return new Set(
    submissionsForCampaign(campaignId).map((submission) => submission.employeeId),
  );
}

export function eligibleEmployees(campaign) {
  if (!campaign) return [];
  const explicitEligibility = ELIGIBILITY.filter(
    (row) => row.campaignId === campaign.id && row.eligible,
  );
  if (explicitEligibility.length) {
    const ids = new Set(explicitEligibility.map((row) => row.employeeId));
    return EMPLOYEES.filter((employee) => ids.has(employee.id));
  }
  return EMPLOYEES.filter(
    (employee) => employee.status === "Ativo" && campaign.departmentIds.includes(employee.departmentId),
  );
}

const WEEKDAY_KEY = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

export function calendarData(campaign, departmentFilter = "all") {
  const map = {};
  if (!campaign) return map;
  const submissions = submissionsForCampaign(campaign.id);
  const start = new Date(`${campaign.leavePeriod.start}T00:00:00`);
  const end = new Date(`${campaign.leavePeriod.end}T00:00:00`);
  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const weekday = WEEKDAY_KEY[date.getDay()];
    const departmentIds = departmentFilter === "all" ? campaign.departmentIds : [departmentFilter];
    let capacity = departmentIds.reduce(
      (total, departmentId) => total + (campaign.rules[departmentId]?.[weekday] ?? 0),
      0,
    );
    for (const exception of campaign.exceptions) {
      if (exception.date !== iso || (departmentFilter !== "all" && exception.departmentId !== departmentFilter)) continue;
      if (exception.type === "Bloquear data") capacity = 0;
      if (exception.type === "Alterar capacidade") capacity = exception.capacity ?? capacity;
    }
    const registrations = submissions.flatMap((submission) => {
      if (!submission.dates.includes(iso)) return [];
      const employee = employeeById(submission.employeeId);
      if (!employee || (departmentFilter !== "all" && employee.departmentId !== departmentFilter)) return [];
      return [employee.registration];
    });
    const used = registrations.length;
    const status = capacity === 0
      ? "Indisponível"
      : used > capacity
        ? "Excedido"
        : used === capacity
          ? "Lotado"
          : used >= capacity * 0.7
            ? "Quase lotado"
            : "Disponível";
    map[iso] = { used, capacity, status, registrations };
  }
  return map;
}

export function campaignKpis(campaign) {
  if (!campaign) return { eligible: 0, responded: 0, pending: 0, participation: 0, totalChoices: 0, departments: 0 };
  const eligible = eligibleEmployees(campaign);
  const responded = respondedEmployeeIds(campaign.id);
  const submissions = submissionsForCampaign(campaign.id);
  return {
    eligible: eligible.length,
    responded: responded.size,
    pending: eligible.filter((employee) => !responded.has(employee.id)).length,
    participation: eligible.length ? Math.round((responded.size / eligible.length) * 100) : 0,
    totalChoices: submissions.reduce((total, submission) => total + submission.dates.length, 0),
    departments: new Set(eligible.map((employee) => employee.departmentId)).size,
  };
}

export function departmentSummary(campaign) {
  if (!campaign) return [];
  const eligible = eligibleEmployees(campaign);
  const responded = respondedEmployeeIds(campaign.id);
  return DEPARTMENTS.filter((department) => campaign.departmentIds.includes(department.id)).map((department) => {
    const departmentEligible = eligible.filter((employee) => employee.departmentId === department.id);
    const respondedCount = departmentEligible.filter((employee) => responded.has(employee.id)).length;
    return {
      ...department,
      eligible: departmentEligible.length,
      responded: respondedCount,
      pending: departmentEligible.length - respondedCount,
      participation: departmentEligible.length ? Math.round((respondedCount / departmentEligible.length) * 100) : 0,
    };
  });
}

export function mostRequestedDates(campaign) {
  if (!campaign) return [];
  const counts = {};
  for (const submission of submissionsForCampaign(campaign.id)) {
    for (const date of submission.dates) {
      counts[date] ??= { date, count: 0, departments: new Set() };
      counts[date].count += 1;
      const employee = employeeById(submission.employeeId);
      if (employee) counts[date].departments.add(departmentName(employee.departmentId));
    }
  }
  return Object.values(counts)
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map((row) => ({ ...row, departments: Array.from(row.departments).join(", ") }));
}

export function pendingEmployees(campaign) {
  if (!campaign) return [];
  const responded = respondedEmployeeIds(campaign.id);
  return eligibleEmployees(campaign).filter((employee) => !responded.has(employee.id));
}

export function employeeHistory(employeeId) {
  return [];
}

export const SETTINGS = {
  general: { systemName: "Gestão de Compensações", teamName: "", timezone: "America/Sao_Paulo", dateFormat: "DD/MM/YYYY", language: "Português (Brasil)" },
  publicForm: {
    title: "Compensação de Feriados",
    instruction: "Informe sua matrícula para escolher suas folgas.",
    invalidRegistrationMessage: "Matrícula não encontrada.",
    closedMessage: "O período de escolha foi encerrado.",
    scheduledMessage: "Esta campanha ainda não está disponível para preenchimento.",
    successMessage: "Escolha registrada com sucesso.",
    managerContact: "",
    showMaskedEmail: true,
    showNumericCapacity: true,
    displayName: "Gestão de Compensações",
    primaryColor: "#4f46e5",
  },
  email: { senderName: "Gestão de Compensações", senderEmail: "", replyTo: "", sendEmployeeConfirmation: true, sendConfirmationAfterAdminChange: true, defaultSubject: "Confirmação de escolha de folga — {{campanha}}" },
  security: { mfaEnabled: true, method: "Aplicativo autenticador" },
  preferences: { theme: "Claro", tableDensity: "Confortável", rowsPerPage: 10, firstDayOfWeek: "Domingo", showWeekends: true },
};

export const SESSIONS = [];
export const RECOVERY_CODES = [];
export const AUDIT_LOG = [];
export const PT_WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const PT_WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const PT_MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function formatDatePT(value) {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatDateTimePT(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
