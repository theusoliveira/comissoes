import * as XLSX from "xlsx";
import type { Lancamento, NovoLancamento } from "./types";
import { brToIso, calc, isoToBr, normDesc } from "./format";

const strip = (s: unknown) =>
  String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return NaN;
  let s = String(v).replace(/[R$\s%]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return Number(s);
}

function toIso(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const d = new Date(v.getTime() + 12 * 3600e3);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = XLSX.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof v === "string") {
    const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(v.trim());
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return brToIso(`${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}/${y}`);
    }
  }
  return null;
}

/** Lê a planilha (formato DATA | QTDE | DESCRIÇÃO | VALOR UNITÁRIO | VALOR TOTAL | COMISSÃO | VALOR LÍQUIDO). */
export async function lerPlanilha(file: File): Promise<NovoLancamento[]> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  for (const name of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: null });
    for (let h = 0; h < Math.min(aoa.length, 20); h++) {
      const hdr = (aoa[h] ?? []).map(strip);
      const col = (k: string) => hdr.findIndex((c) => c === k || c.startsWith(k));
      const ci = { data: col("DATA"), qtde: col("QTD"), desc: col("DESCRI"), unit: col("VALOR UNIT"), com: col("COMISS"), total: col("VALOR TOTAL") };
      if (ci.data < 0 || ci.desc < 0 || (ci.unit < 0 && ci.total < 0)) continue;

      const out: NovoLancamento[] = [];
      for (const r of aoa.slice(h + 1)) {
        if (!r) continue;
        const descricao = normDesc(r[ci.desc]);
        const data = toIso(r[ci.data]);
        if (!descricao || !data) continue;

        let qtde = ci.qtde >= 0 ? toNum(r[ci.qtde]) : 1;
        if (!(qtde > 0)) qtde = 1;
        let unit = ci.unit >= 0 ? toNum(r[ci.unit]) : NaN;
        if (!(unit >= 0)) { const t = toNum(r[ci.total]); unit = t >= 0 ? t / qtde : NaN; }
        if (!(unit >= 0)) continue;

        const raw = ci.com >= 0 ? r[ci.com] : 0;
        let comissao = toNum(raw);
        if (!(comissao >= 0)) comissao = 0;
        if (typeof raw === "number" && comissao <= 1) comissao *= 100; // Excel guarda 5% como 0,05
        comissao = Math.min(100, Math.round(comissao * 100) / 100);

        out.push({ data, qtde: Math.round(qtde * 100) / 100, descricao: descricao.slice(0, 120), valor_unitario: Math.round(unit * 100) / 100, comissao });
      }
      if (out.length) return out;
    }
  }
  return [];
}

/** Gera um .xlsx no mesmo formato da planilha original (serve de backup e pode ser reimportado). */
export function exportarPlanilha(list: Lancamento[]): Blob {
  const rows = list.map((e) => {
    const c = calc(e);
    return {
      DATA: isoToBr(e.data), QTDE: e.qtde, "DESCRIÇÃO": e.descricao, "VALOR UNITÁRIO": e.valor_unitario,
      "VALOR TOTAL": Math.round(c.bruto * 100) / 100, "COMISSÃO": e.comissao / 100, "VALOR LÍQUIDO": Math.round(c.liquido * 100) / 100,
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 11 }, { wch: 7 }, { wch: 36 }, { wch: 15 }, { wch: 13 }, { wch: 10 }, { wch: 14 }];
  for (let i = 2; i <= rows.length + 1; i++) {
    for (const c of ["D", "E", "G"]) if (ws[`${c}${i}`]) ws[`${c}${i}`].z = '"R$" #,##0.00';
    if (ws[`F${i}`]) ws[`F${i}`].z = "0%";
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Comissões");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
