/** Máscaras: recebem o texto digitado e devolvem o texto formatado. */

export function maskDate(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

export function maskMoney(v: string): string {
  const d = v.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  if (!d) return "";
  return (Number(d) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function maskDecimal(v: string, maxDec = 2): string {
  let s = v.replace(/[^\d,]/g, "");
  const i = s.indexOf(",");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, "").slice(0, maxDec);
  if (s.startsWith(",")) s = `0${s}`;
  return s.slice(0, 8);
}

export const parseMoney = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d ? Number(d) / 100 : NaN;
};

export const parseDecimal = (s: string) => {
  const v = s.replace(/[^\d,]/g, "").replace(",", ".");
  return v ? Number(v) : NaN;
};
