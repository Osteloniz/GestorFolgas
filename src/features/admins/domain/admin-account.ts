import { z } from "zod";

export const createAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  temporaryPassword: z.string()
    .min(10, "A senha provisória deve ter ao menos 10 caracteres.")
    .max(128)
    .regex(/[a-z]/, "Inclua uma letra minúscula.")
    .regex(/[A-Z]/, "Inclua uma letra maiúscula.")
    .regex(/[0-9]/, "Inclua um número."),
});

export function getAdminStatusChangeError(input: {
  targetAdminId: string;
  currentAdminId: string;
  nextActive: boolean;
  activeAdminCount: number;
}) {
  if (input.nextActive) return null;
  if (input.targetAdminId === input.currentAdminId) return "Você não pode desativar a própria conta.";
  if (input.activeAdminCount <= 1) return "O sistema deve manter ao menos um administrador ativo.";
  return null;
}
