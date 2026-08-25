import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { z } from "zod";

config({ path: ".env.local" });

const [{ createAuth }, { closeDb, getDb }, { adminUsers, user }] = await Promise.all([
  import("../src/auth/auth"),
  import("../src/db/client"),
  import("../src/db/schema"),
]);

const positionalArguments = process.argv.slice(2).filter((argument) => !argument.startsWith("--"));
const email = getArgument("--email") ?? positionalArguments.find((argument) => argument.includes("@"));
const name =
  getArgument("--name") ??
  positionalArguments.find((argument) => argument !== email) ??
  "Administrador Master";

if (!email) throw new Error("Informe --email.");

const password = await readSecret("Senha inicial: ");
if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

const db = getDb();
const seedAuth = createAuth({ allowSignUp: true });

try {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0) {
    throw new Error("O usuário já existe; o seed não altera credenciais existentes.");
  }

  const signUpResponse = await seedAuth.api.signUpEmail({
    body: { email, password, name },
    asResponse: true,
  });
  if (!signUpResponse.ok) throw new Error("Não foi possível criar o usuário master.");

  const signUpData = z
    .object({ user: z.object({ id: z.string() }) })
    .parse(await signUpResponse.json());
  const cookie = extractCookies(signUpResponse.headers);
  if (!cookie) throw new Error("A sessão inicial não foi criada.");

  await db.insert(adminUsers).values({
    authUserId: signUpData.user.id,
    email,
    name,
    active: true,
  });

  const enableResponse = await seedAuth.api.enableTwoFactor({
    body: { password, method: "totp" },
    headers: new Headers({ cookie }),
    asResponse: true,
  });
  if (!enableResponse.ok) throw new Error("Não foi possível habilitar o TOTP.");

  const enrollment = z
    .object({
      method: z.string().optional(),
      totpURI: z.string().url(),
      backupCodes: z.array(z.string()).min(1),
    })
    .parse(await enableResponse.json());

  const secretsDirectory = resolve(".secrets");
  await mkdir(secretsDirectory, { recursive: true });
  await Promise.all([
    QRCode.toFile(resolve(secretsDirectory, "master-totp-qr.png"), enrollment.totpURI, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 512,
    }),
    writeFile(
      resolve(secretsDirectory, "master-recovery-codes.txt"),
      `${enrollment.backupCodes.join("\n")}\n`,
      { encoding: "utf8", mode: 0o600 },
    ),
  ]);

  console.log("MASTER_CREATED");
  console.log(resolve(secretsDirectory, "master-totp-qr.png"));
  console.log(resolve(secretsDirectory, "master-recovery-codes.txt"));
} finally {
  await closeDb();
}

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function extractCookies(headers: Headers): string {
  const values = headers.getSetCookie?.() ?? [];
  return values.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
}

async function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Execute o seed em um terminal interativo.");
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  return new Promise((resolvePassword, reject) => {
    let value = "";

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
      process.stdout.write("\n");
    };

    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("Operação cancelada."));
          return;
        }
        if (character === "\r" || character === "\n") {
          cleanup();
          resolvePassword(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    process.stdin.on("data", onData);
  });
}
