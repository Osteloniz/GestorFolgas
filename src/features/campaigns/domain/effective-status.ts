export type EffectiveCampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | "CANCELLED";

type CampaignPeriod = {
  storedStatus: EffectiveCampaignStatus;
  responseStartAt: Date;
  responseEndAt: Date;
  cancelledAt?: Date | null;
};

export function getEffectiveCampaignStatus(
  campaign: CampaignPeriod,
  now: Date = new Date(),
): EffectiveCampaignStatus {
  if (campaign.storedStatus === "CANCELLED" || campaign.cancelledAt) return "CANCELLED";
  if (campaign.storedStatus === "DRAFT") return "DRAFT";
  if (now < campaign.responseStartAt) return "SCHEDULED";
  if (now <= campaign.responseEndAt) return "OPEN";
  return "CLOSED";
}
