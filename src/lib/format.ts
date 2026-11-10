import type { Lancamento, NovoLancamento } from "./types";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const brl = (n: number) =>
  round2(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const num = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d, useGrouping: false });

export const pct = (p: number) => `${num(p)}%`;

export const isoToBr = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

export function brToIso(br: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const weekday = (iso: string) =>
  new Date(`${iso}T12:00`).toLocaleDateString("pt-BR", { weekday: "long" });

export function calc(e: Pick<NovoLancamento, "qtde" | "valor_unitario" | "comissao">) {
  const bruto = e.qtde * e.valor_unitario;
  return { bruto, liquido: (bruto * e.comissao) / 100 };
}

export function totais(list: Lancamento[]) {
  return list.reduce(
    (t, e) => { const c = calc(e); return { bruto: t.bruto + c.bruto, liquido: t.liquido + c.liquido }; },
    { bruto: 0, liquido: 0 },
  );
}

export const normDesc = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").toUpperCase();
