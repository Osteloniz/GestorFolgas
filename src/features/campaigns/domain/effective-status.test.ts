import { describe, expect, it } from "vitest";

import { getEffectiveCampaignStatus } from "./effective-status";

const period = {
  storedStatus: "SCHEDULED" as const,
  responseStartAt: new Date("2026-10-01T12:00:00.000Z"),
  responseEndAt: new Date("2026-10-10T12:00:00.000Z"),
};

describe("getEffectiveCampaignStatus", () => {
  it("mantém rascunhos fora do cálculo temporal", () => {
    expect(
      getEffectiveCampaignStatus(
        { ...period, storedStatus: "DRAFT" },
        new Date("2026-10-05T12:00:00.000Z"),
      ),
    ).toBe("DRAFT");
  });

  it("calcula agendada, aberta e encerrada pelo período", () => {
    expect(getEffectiveCampaignStatus(period, new Date("2026-09-30T12:00:00.000Z"))).toBe("SCHEDULED");
    expect(getEffectiveCampaignStatus(period, new Date("2026-10-05T12:00:00.000Z"))).toBe("OPEN");
    expect(getEffectiveCampaignStatus(period, new Date("2026-10-11T12:00:00.000Z"))).toBe("CLOSED");
  });

  it("prioriza cancelamento explícito", () => {
    expect(
      getEffectiveCampaignStatus(
        { ...period, cancelledAt: new Date("2026-10-02T12:00:00.000Z") },
        new Date("2026-10-05T12:00:00.000Z"),
      ),
    ).toBe("CANCELLED");
  });
});
