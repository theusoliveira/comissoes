import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "sessao";
const DURACAO_S = 60 * 60 * 24 * 30; // 30 dias

function segredo(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  return s;
}

const assinar = (payload: string) => createHmac("sha256", segredo()).update(payload).digest("hex");

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a), bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function senhaConfere(senha: string): boolean {
  const certa = process.env.APP_PASSWORD;
  if (!certa) throw new Error("APP_PASSWORD não configurada.");
  // compara os hashes para não vazar o tamanho da senha
  return iguais(assinar(`pw:${senha}`), assinar(`pw:${certa}`));
}

export async function criarSessao() {
  const exp = Math.floor(Date.now() / 1000) + DURACAO_S;
  const valor = `${exp}.${assinar(String(exp))}`;
  (await cookies()).set(COOKIE, valor, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: DURACAO_S,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export async function logado(): Promise<boolean> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v) return false;
  const [exp, sig] = v.split(".");
  if (!exp || !sig || !iguais(sig, assinar(exp))) return false;
  return Number(exp) > Date.now() / 1000;
}

export async function exigirLogin() {
  if (!(await logado())) throw new Error("Não autorizado");
}
