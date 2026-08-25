export type SubmissionConfirmationInput = {
  submissionId: string;
  recipient: string;
  campaignName: string;
  registration: string;
  employeeName: string;
  departmentName: string;
  leaveDates: string[];
  submittedAt: Date;
};

export type EmailSendClient = {
  send: (
    message: { from: string; to: string[]; subject: string; html: string; text: string },
    options: { idempotencyKey: string },
  ) => Promise<{ data: { id: string } | null; error: unknown | null }>;
};

export type SubmissionEmailResult =
  | { status: "SENT"; providerMessageId: string }
  | { status: "FAILED"; errorCode: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]!);
}

function formatLeaveDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatSubmittedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function providerErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return "provider_error";
  const value = error as { name?: unknown; statusCode?: unknown };
  const name = typeof value.name === "string"
    ? value.name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)
    : "provider_error";
  const status = typeof value.statusCode === "number" ? `_${value.statusCode}` : "";
  return `${name}${status}`;
}

export function buildSubmissionConfirmation(input: SubmissionConfirmationInput) {
  const formattedDates = input.leaveDates.map(formatLeaveDate);
  const recordedAt = formatSubmittedAt(input.submittedAt);
  const subject = `Confirmação de folgas — ${input.campaignName}`;
  const text = [
    `Olá, ${input.employeeName}.`,
    "",
    "Sua escolha de folgas foi registrada com sucesso.",
    "",
    `Campanha: ${input.campaignName}`,
    `Matrícula: ${input.registration}`,
    `Nome: ${input.employeeName}`,
    `Departamento: ${input.departmentName}`,
    `Datas escolhidas: ${formattedDates.join(", ")}`,
    `Registrado em: ${recordedAt}`,
    "",
    "Se precisar solicitar uma alteração, procure seu gestor.",
  ].join("\n");
  const datesHtml = formattedDates.map((date) => `<li style="margin:4px 0">${escapeHtml(date)}</li>`).join("");
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:28px">
        <h1 style="font-size:22px;margin:0 0 16px">Escolha de folgas confirmada</h1>
        <p>Olá, <strong>${escapeHtml(input.employeeName)}</strong>.</p>
        <p>Sua escolha foi registrada com sucesso.</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr><td style="padding:6px 0;color:#64748b">Campanha</td><td style="padding:6px 0;text-align:right">${escapeHtml(input.campaignName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Matrícula</td><td style="padding:6px 0;text-align:right">${escapeHtml(input.registration)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Nome</td><td style="padding:6px 0;text-align:right">${escapeHtml(input.employeeName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Departamento</td><td style="padding:6px 0;text-align:right">${escapeHtml(input.departmentName)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Registrado em</td><td style="padding:6px 0;text-align:right">${escapeHtml(recordedAt)}</td></tr>
        </table>
        <p style="margin-bottom:6px"><strong>Datas escolhidas</strong></p>
        <ul style="margin-top:0;padding-left:20px">${datesHtml}</ul>
        <p style="margin-top:24px;color:#475569">Se precisar solicitar uma alteração, procure seu gestor.</p>
      </div>
    </div>
  </body>
</html>`;
  return { subject, text, html };
}

export async function sendSubmissionConfirmationEmail(
  input: SubmissionConfirmationInput,
  from: string,
  client: EmailSendClient,
): Promise<SubmissionEmailResult> {
  try {
    const content = buildSubmissionConfirmation(input);
    const { data, error } = await client.send({
      from,
      to: [input.recipient],
      ...content,
    }, {
      idempotencyKey: `leave-confirmation/${input.submissionId}`,
    });
    if (error || !data?.id) return { status: "FAILED", errorCode: providerErrorCode(error) };
    return { status: "SENT", providerMessageId: data.id };
  } catch (error) {
    return { status: "FAILED", errorCode: providerErrorCode(error) };
  }
}
