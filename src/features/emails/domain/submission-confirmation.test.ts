import { describe, expect, it, vi } from "vitest";

import { buildSubmissionConfirmation, sendSubmissionConfirmationEmail } from "./submission-confirmation";

const input = {
  submissionId: "submission-123",
  recipient: "pessoa@empresa.com",
  campaignName: "Compensação de Novembro",
  registration: "00123",
  employeeName: "João da Silva",
  departmentName: "Operações",
  leaveDates: ["2026-11-20", "2026-11-23"],
  submittedAt: new Date("2026-08-25T15:30:00Z"),
};

describe("confirmação de submissão por e-mail", () => {
  it("monta o conteúdo completo em PT-BR", () => {
    const content = buildSubmissionConfirmation(input);

    expect(content.subject).toContain("Compensação de Novembro");
    expect(content.text).toContain("Matrícula: 00123");
    expect(content.text).toContain("20/11/2026, 23/11/2026");
    expect(content.text).toContain("procure seu gestor");
  });

  it("usa idempotência por submissão e retorna SENT", async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: "email-123" }, error: null });

    await expect(sendSubmissionConfirmationEmail(input, "Folgas <onboarding@resend.dev>", { send }))
      .resolves.toEqual({ status: "SENT", providerMessageId: "email-123" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: [input.recipient] }), {
      idempotencyKey: "leave-confirmation/submission-123",
    });
  });

  it("converte falha do provedor em FAILED sem lançar exceção", async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { name: "validation_error", statusCode: 403, message: "detalhe sensível" },
    });

    await expect(sendSubmissionConfirmationEmail(input, "Folgas <onboarding@resend.dev>", { send }))
      .resolves.toEqual({ status: "FAILED", errorCode: "validation_error_403" });
  });
});
