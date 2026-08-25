import { describe, expect, it } from "vitest";

import { summarizeEmployeeImport, validateEmployeeImport } from "./import-validation";

const departments = [
  { id: "dep-1", name: "Recursos Humanos", code: "RH", active: true },
  { id: "dep-2", name: "Operações", code: "OPS", active: false },
];

const employees = [
  { id: "emp-1", registrationNumber: "0012", name: "Maria Lima", email: "maria@empresa.com", departmentId: "dep-1", active: true },
];

describe("validateEmployeeImport", () => {
  it("preserva zeros da matrícula, normaliza e-mail e resolve departamento por código", () => {
    const [row] = validateEmployeeImport([
      { rowNumber: 2, registration: " 0013 ", name: " João Silva ", email: " JOAO@EMPRESA.COM ", department: " rh " },
    ], departments, employees);

    expect(row).toMatchObject({
      registration: "0013",
      email: "joao@empresa.com",
      departmentId: "dep-1",
      action: "CREATE",
      errors: [],
    });
  });

  it("classifica matrícula existente como atualização sem duplicá-la", () => {
    const [row] = validateEmployeeImport([
      { rowNumber: 2, registration: "0012", name: "Maria Lima", email: "novo@empresa.com", department: "Recursos Humanos" },
    ], departments, employees);

    expect(row.action).toBe("UPDATE");
  });

  it("bloqueia todas as ocorrências duplicadas e departamentos inexistentes ou inativos", () => {
    const rows = validateEmployeeImport([
      { rowNumber: 2, registration: "99", name: "Pessoa Um", email: "um@empresa.com", department: "Financeiro" },
      { rowNumber: 3, registration: "99", name: "Pessoa Dois", email: "dois@empresa.com", department: "OPS" },
    ], departments, employees);

    expect(summarizeEmployeeImport(rows).errors).toBe(2);
    expect(rows[0].errors).toContain("Matrícula duplicada no arquivo.");
    expect(rows[0].errors).toContain("Departamento não encontrado por nome ou código.");
    expect(rows[1].errors).toContain("Departamento está inativo.");
  });
});
