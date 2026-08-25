import React, { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const actionPresentation = {
  CREATE: { label: "Novo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UPDATE: { label: "Atualizar", className: "border-amber-200 bg-amber-50 text-amber-700" },
  UNCHANGED: { label: "Sem alteração", className: "border-slate-200 bg-slate-50 text-slate-600" },
  ERROR: { label: "Erro", className: "border-rose-200 bg-rose-50 text-rose-700" },
};

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "Não foi possível concluir a operação.");
    Object.assign(error, payload);
    throw error;
  }
  return payload;
}

export function ImportFlow({ open, onOpenChange, onImported }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setFileName("");
    setPreview(null);
    setError("");
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function changeOpen(nextOpen) {
    if (!nextOpen && !loading) reset();
    onOpenChange(nextOpen);
  }

  async function previewFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/employees/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      setPreview(await readResponse(response));
    } catch (caught) {
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview || preview.summary.errors > 0) return;
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/employees/import", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows.map(({ rowNumber, registration, name, email, department }) => ({
            rowNumber, registration, name, email, department,
          })),
        }),
      });
      const result = await readResponse(response);
      onImported(result.summary);
    } catch (caught) {
      if (caught.rows && caught.summary) setPreview({ rows: caught.rows, summary: caught.summary });
      setError(caught.message);
    } finally {
      setLoading(false);
    }
  }

  const canImport = preview && preview.summary.errors === 0
    && (preview.summary.create + preview.summary.update > 0);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar colaboradores</DialogTitle>
          <DialogDescription>
            Envie um XLSX de até 5 MB com as colunas MATRÍCULA, NOME, EMAIL e DEPARTAMENTO.
          </DialogDescription>
          <div className="pt-2">
            <Button asChild variant="link" className="h-auto p-0">
              <a href="/api/admin/employees/import" download>Baixar planilha modelo</a>
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1">
          <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm transition-colors hover:bg-slate-100">
            {loading && !preview ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
            <span>{fileName || "Selecionar planilha XLSX"}</span>
            <Input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={previewFile} disabled={loading} />
          </label>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Não foi possível importar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {preview && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <Metric label="Linhas" value={preview.summary.total} />
                <Metric label="Novos" value={preview.summary.create} />
                <Metric label="Atualizações" value={preview.summary.update} />
                <Metric label="Sem alteração" value={preview.summary.unchanged} />
                <Metric label="Erros" value={preview.summary.errors} danger={preview.summary.errors > 0} />
              </div>

              {preview.summary.errors > 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Corrija a planilha antes de confirmar</AlertTitle>
                  <AlertDescription>Nenhuma linha será gravada enquanto houver inconsistências.</AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>Planilha validada</AlertTitle>
                  <AlertDescription>A confirmação aplicará todas as alterações em uma única transação.</AlertDescription>
                </Alert>
              )}

              <div className="max-h-[340px] overflow-auto rounded-lg border">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Matrícula</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden md:table-cell">Departamento</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row) => {
                      const presentation = actionPresentation[row.action];
                      return (
                        <TableRow key={`${row.rowNumber}-${row.registration}`}>
                          <TableCell>{row.rowNumber}</TableCell>
                          <TableCell className="font-mono text-xs">{row.registration || "—"}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.email || "—"}</div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{row.departmentName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={presentation.className}>{presentation.label}</Badge>
                            {row.errors.length > 0 && <p className="mt-1 max-w-xs text-xs text-rose-600">{row.errors.join(" ")}</p>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={confirmImport} disabled={!canImport || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Confirmar importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, danger = false }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${danger ? "border-rose-200 bg-rose-50" : "bg-white"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${danger ? "text-rose-700" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}
