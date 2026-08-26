import { describe, expect, it } from "vitest";

import { createAdminSchema, getAdminStatusChangeError } from "./admin-account";

describe("admin account", () => {
  it("normaliza o e-mail e aceita senha provisória forte", () => {
    expect(createAdminSchema.parse({
      name: "  Nova Gestora  ",
      email: " GESTORA@EMPRESA.COM ",
      temporaryPassword: "Temporaria2026",
    })).toMatchObject({ name: "Nova Gestora", email: "gestora@empresa.com" });
  });

  it("rejeita senha provisória fraca", () => {
    expect(createAdminSchema.safeParse({
      name: "Nova Gestora",
      email: "gestora@empresa.com",
      temporaryPassword: "123456",
    }).success).toBe(false);
  });

  it("impede autodesativação e preserva o último administrador", () => {
    expect(getAdminStatusChangeError({
      targetAdminId: "a1", currentAdminId: "a1", nextActive: false, activeAdminCount: 2,
    })).toContain("própria");
    expect(getAdminStatusChangeError({
      targetAdminId: "a2", currentAdminId: "a1", nextActive: false, activeAdminCount: 1,
    })).toContain("ao menos um");
  });

  it("permite manter vários administradores ativos simultaneamente", () => {
    expect(getAdminStatusChangeError({
      targetAdminId: "a2", currentAdminId: "a1", nextActive: true, activeAdminCount: 2,
    })).toBeNull();
    expect(getAdminStatusChangeError({
      targetAdminId: "a2", currentAdminId: "a1", nextActive: false, activeAdminCount: 2,
    })).toBeNull();
  });
});
