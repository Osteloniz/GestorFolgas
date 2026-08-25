import { describe, expect, it } from "vitest";

import { getTrustedOrigins } from "./trusted-origins";

describe("getTrustedOrigins", () => {
  it("inclui os endereços exatos de produção, branch e deployment da Vercel", () => {
    expect(getTrustedOrigins({
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://gestor-folgas.vercel.app",
      VERCEL_URL: "gestor-folgas-a1b2.vercel.app",
      VERCEL_BRANCH_URL: "gestor-folgas-git-main-projeto.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "gestor-folgas.vercel.app",
    })).toEqual([
      "https://gestor-folgas.vercel.app",
      "https://gestor-folgas-a1b2.vercel.app",
      "https://gestor-folgas-git-main-projeto.vercel.app",
    ]);
  });

  it("não confia em localhost na instância de produção", () => {
    expect(getTrustedOrigins({
      NODE_ENV: "production",
      BETTER_AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "https://gestor-folgas.vercel.app/path",
    })).toEqual(["https://gestor-folgas.vercel.app"]);
  });

  it("mantém localhost disponível no desenvolvimento", () => {
    expect(getTrustedOrigins({
      NODE_ENV: "development",
      BETTER_AUTH_URL: "http://localhost:3000",
    })).toEqual(["http://localhost:3000"]);
  });
});
