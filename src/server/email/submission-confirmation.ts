import "server-only";

import { eq } from "drizzle-orm";
import { Resend } from "resend";

import { getDb } from "@/db";
import { emailDeliveries } from "@/db/schema";
import {
  sendSubmissionConfirmationEmail,
  type SubmissionConfirmationInput,
} from "@/features/emails/domain/submission-confirmation";

type DeliveryInput = SubmissionConfirmationInput & { deliveryId: string };

export async function deliverSubmissionConfirmation(input: DeliveryInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const now = new Date();

  const result = !apiKey || !from
    ? { status: "FAILED" as const, errorCode: "configuration_missing" }
    : await sendSubmissionConfirmationEmail(input, from, {
      send: (message, options) => new Resend(apiKey).emails.send(message, options),
    });

  if (result.status === "SENT") {
    await getDb().update(emailDeliveries).set({
      status: "SENT",
      providerMessageId: result.providerMessageId,
      attempts: 1,
      lastError: null,
      sentAt: now,
      updatedAt: now,
    }).where(eq(emailDeliveries.id, input.deliveryId));
  } else {
    await getDb().update(emailDeliveries).set({
      status: "FAILED",
      attempts: 1,
      lastError: result.errorCode,
      updatedAt: now,
    }).where(eq(emailDeliveries.id, input.deliveryId));
  }

  return result.status;
}
