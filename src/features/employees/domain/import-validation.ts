import { z } from "zod";

export type EmployeeImportInput = {
  rowNumber: number;
  registration: string;
  name: string;
  email: string;
  department: string;
};

export type DepartmentReference = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
};

export type EmployeeReference = {
  id: string;
  registrationNumber: string;
  name: string;
  email: string;
  departmentId: string;
  active: boolean;
};

export type EmployeeImportPreviewRow = EmployeeImportInput & {
  departmentId: string | null;
  departmentName: string;
  action: "CREATE" | "UPDATE" | "UNCHANGED" | "ERROR";
  errors: string[];
};

const emailSchema = z.string().email();

export function normalizeLookupKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function validateEmployeeImport(
  inputRows: EmployeeImportInput[],
  departmentRows: DepartmentReference[],
  employeeRows: EmployeeReference[],
): EmployeeImportPreviewRow[] {
  const departmentIndex = new Map<string, DepartmentReference[]>();
  for (const department of departmentRows) {
    const keys = [department.name, department.code].filter((value): value is string => Boolean(value?.trim()));
    for (const value of keys) {
      const key = normalizeLookupKey(value);
      const matches = departmentIndex.get(key) ?? [];
      if (!matches.some((match) => match.id === department.id)) matches.push(department);
      departmentIndex.set(key, matches);
    }
  }

  const employeesByRegistration = new Map(employeeRows.map((employee) => [employee.registrationNumber, employee]));
  const registrationCounts = new Map<string, number>();
  for (const row of inputRows) {
    const registration = row.registration.trim();
    registrationCounts.set(registration, (registrationCounts.get(registration) ?? 0) + 1);
  }

  return inputRows.map((input) => {
    const registration = input.registration.trim();
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const department = input.department.trim();
    const errors: string[] = [];

    if (!registration) errors.push("Matrícula obrigatória.");
    if (registration.length > 50) errors.push("Matrícula deve ter no máximo 50 caracteres.");
    if ((registrationCounts.get(registration) ?? 0) > 1) errors.push("Matrícula duplicada no arquivo.");
    if (name.length < 2) errors.push("Nome deve ter ao menos 2 caracteres.");
    if (name.length > 160) errors.push("Nome deve ter no máximo 160 caracteres.");
    if (!emailSchema.safeParse(email).success || email.length > 254) errors.push("E-mail inválido.");
    if (!department) errors.push("Departamento obrigatório.");

    const departmentMatches = department ? (departmentIndex.get(normalizeLookupKey(department)) ?? []) : [];
    const matchedDepartment = departmentMatches.length === 1 ? departmentMatches[0] : null;
    if (department && departmentMatches.length === 0) errors.push("Departamento não encontrado por nome ou código.");
    if (departmentMatches.length > 1) errors.push("Departamento ambíguo; use o código cadastrado.");
    if (matchedDepartment && !matchedDepartment.active) errors.push("Departamento está inativo.");

    const existing = employeesByRegistration.get(registration);
    let action: EmployeeImportPreviewRow["action"] = "CREATE";
    if (errors.length > 0) action = "ERROR";
    else if (existing) {
      const changed = existing.name !== name
        || existing.email.toLowerCase() !== email
        || existing.departmentId !== matchedDepartment?.id;
      action = changed ? "UPDATE" : "UNCHANGED";
    }

    return {
      rowNumber: input.rowNumber,
      registration,
      name,
      email,
      department,
      departmentId: matchedDepartment?.id ?? null,
      departmentName: matchedDepartment?.name ?? department,
      action,
      errors,
    };
  });
}

export function summarizeEmployeeImport(rows: EmployeeImportPreviewRow[]) {
  return {
    total: rows.length,
    create: rows.filter((row) => row.action === "CREATE").length,
    update: rows.filter((row) => row.action === "UPDATE").length,
    unchanged: rows.filter((row) => row.action === "UNCHANGED").length,
    errors: rows.filter((row) => row.action === "ERROR").length,
  };
}
