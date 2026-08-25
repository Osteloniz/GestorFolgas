import ExcelJS from "exceljs";
import { asc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin, UnauthorizedError } from "@/auth/require-admin";
import { getDb } from "@/db";
import { auditLogs, departments, employees } from "@/db/schema";
import {
  summarizeEmployeeImport,
  validateEmployeeImport,
  type EmployeeImportInput,
} from "@/features/employees/domain/import-validation";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2_000;
const requiredHeaders = ["MATRICULA", "NOME", "EMAIL", "DEPARTAMENTO"] as const;

class InvalidImportError extends Error {}

const commitSchema = z.object({
  rows: z.array(z.object({
    rowNumber: z.number().int().positive(),
    registration: z.string(),
    name: z.string(),
    email: z.string(),
    department: z.string(),
  })).min(1).max(MAX_ROWS),
});

function normalizeHeader(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

async function parseWorkbook(file: File): Promise<EmployeeImportInput[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new InvalidImportError("Envie uma planilha no formato .xlsx.");
  if (file.size === 0) throw new InvalidImportError("A planilha está vazia.");
  if (file.size > MAX_FILE_BYTES) throw new InvalidImportError("A planilha deve ter no máximo 5 MB.");

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new InvalidImportError("O arquivo XLSX está corrompido ou não pôde ser lido.");
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new InvalidImportError("A planilha não possui abas.");

  let headerRow: ExcelJS.Row | undefined;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (!headerRow) headerRow = row;
  });
  if (!headerRow) throw new InvalidImportError("A planilha não possui cabeçalho.");

  const columns = new Map<string, number>();
  headerRow.eachCell((cell, columnNumber) => {
    const header = normalizeHeader(cell.text);
    if (requiredHeaders.includes(header as (typeof requiredHeaders)[number])) columns.set(header, columnNumber);
  });
  const missing = requiredHeaders.filter((header) => !columns.has(header));
  if (missing.length > 0) throw new InvalidImportError(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);

  const rows: EmployeeImportInput[] = [];
  for (let rowNumber = headerRow.number + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = Object.fromEntries(requiredHeaders.map((header) => [header, row.getCell(columns.get(header)!).text]));
    if (Object.values(values).every((value) => !value.trim())) continue;
    rows.push({
      rowNumber,
      registration: values.MATRICULA,
      name: values.NOME,
      email: values.EMAIL,
      department: values.DEPARTAMENTO,
    });
    if (rows.length > MAX_ROWS) throw new InvalidImportError(`A planilha deve ter no máximo ${MAX_ROWS} linhas de dados.`);
  }
  if (rows.length === 0) throw new InvalidImportError("A planilha não possui colaboradores para importar.");
  return rows;
}

async function loadReferences(db: ReturnType<typeof getDb>) {
  const [departmentRows, employeeRows] = await Promise.all([
    db.select().from(departments).orderBy(asc(departments.name)),
    db.select().from(employees),
  ]);
  return { departmentRows, employeeRows };
}

export async function GET() {
  try {
    await requireAdmin();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Colaboradores");
    worksheet.addRow(["MATRÍCULA", "NOME", "EMAIL", "DEPARTAMENTO"]);
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns = [
      { width: 18 },
      { width: 34 },
      { width: 36 },
      { width: 28 },
    ];
    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=modelo-colaboradores.xlsx",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    console.error("Falha ao gerar modelo de importação.", error);
    return NextResponse.json({ error: "Não foi possível gerar o modelo." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma planilha XLSX." }, { status: 400 });

    const inputRows = await parseWorkbook(file);
    const { departmentRows, employeeRows } = await loadReferences(getDb());
    const rows = validateEmployeeImport(inputRows, departmentRows, employeeRows);
    return NextResponse.json({ rows, summary: summarizeEmployeeImport(rows) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof InvalidImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Falha ao pré-validar importação de colaboradores.", error);
    return NextResponse.json({ error: "Não foi possível ler a planilha." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { admin } = await requireAdmin();
    const { rows: inputRows } = commitSchema.parse(await request.json());
    const db = getDb();

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('employee-import'))`);
      const [departmentRows, employeeRows] = await Promise.all([
        tx.select().from(departments).orderBy(asc(departments.name)),
        tx.select().from(employees),
      ]);
      const rows = validateEmployeeImport(inputRows, departmentRows, employeeRows);
      const summary = summarizeEmployeeImport(rows);
      if (summary.errors > 0) {
        const validationError = new Error("A planilha mudou ou contém inconsistências. Revise a prévia.");
        Object.assign(validationError, { code: "IMPORT_VALIDATION", rows, summary });
        throw validationError;
      }

      const existingByRegistration = new Map(employeeRows.map((employee) => [employee.registrationNumber, employee]));
      const auditValues: Array<typeof auditLogs.$inferInsert> = [];
      for (const row of rows) {
        if (row.action === "UNCHANGED") continue;
        const existing = existingByRegistration.get(row.registration);
        const [employee] = await tx.insert(employees).values({
          registrationNumber: row.registration,
          name: row.name,
          email: row.email,
          departmentId: row.departmentId!,
          active: existing?.active ?? true,
        }).onConflictDoUpdate({
          target: employees.registrationNumber,
          set: { name: row.name, email: row.email, departmentId: row.departmentId!, updatedAt: new Date() },
        }).returning();
        auditValues.push({
          actorUserId: admin.id,
          actorType: "ADMIN",
          action: "EMPLOYEE_IMPORTED",
          entityType: "employee",
          entityId: employee.id,
          employeeId: employee.id,
          beforeData: existing ? { name: existing.name, email: existing.email, departmentId: existing.departmentId } : null,
          afterData: { registration: employee.registrationNumber, name: employee.name, email: employee.email, departmentId: employee.departmentId, mode: existing ? "UPDATE" : "CREATE" },
        });
      }
      if (auditValues.length > 0) await tx.insert(auditLogs).values(auditValues);
      return summary;
    });

    return NextResponse.json({ summary: result });
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Dados da importação inválidos." }, { status: 400 });
    if (error instanceof Error && (error as Error & { code?: string }).code === "IMPORT_VALIDATION") {
      const validation = error as Error & { rows: unknown; summary: unknown };
      return NextResponse.json({ error: error.message, rows: validation.rows, summary: validation.summary }, { status: 422 });
    }
    console.error("Falha ao importar colaboradores.", error);
    return NextResponse.json({ error: "Não foi possível concluir a importação; nenhuma linha foi aplicada." }, { status: 500 });
  }
}
