"use server";

import { criarSessao, encerrarSessao, senhaConfere } from "@/lib/auth";

export async function entrar(senha: string): Promise<{ ok: boolean }> {
  if (typeof senha !== "string" || !senha) return { ok: false };
  const ok = senhaConfere(senha);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // dificulta tentativas em série
    return { ok: false };
  }
  await criarSessao();
  return { ok: true };
}

export async function sair() {
  await encerrarSessao();
}
