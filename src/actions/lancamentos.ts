"use server";

import { sql } from "@/lib/db";
import { exigirLogin } from "@/lib/auth";
import { fromRow, type Lancamento, type NovoLancamento, type Row } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Validação no servidor: nunca confia no que vem do navegador. */
function validar(e: NovoLancamento): NovoLancamento {
  const data = String(e?.data ?? "");
  const d = new Date(`${data}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== data) throw new Error("Data inválida");
  const qtde = Number(e.qtde), valor = Number(e.valor_unitario), comissao = Number(e.comissao);
  const descricao = String(e.descricao ?? "").trim().replace(/\s+/g, " ").toUpperCase().slice(0, 120);
  if (!(qtde > 0 && qtde < 1e8)) throw new Error("Quantidade inválida");
  if (!(valor >= 0 && valor < 1e10)) throw new Error("Valor inválido");
  if (!(comissao >= 0 && comissao <= 100)) throw new Error("Comissão inválida");
  if (!descricao) throw new Error("Descrição obrigatória");
  return { data, qtde: r2(qtde), descricao, valor_unitario: r2(valor), comissao: r2(comissao) };
}

const COLS = `id, to_char(data, 'YYYY-MM-DD') as data, qtde, descricao, valor_unitario, comissao`;

export async function listar(): Promise<Lancamento[]> {
  await exigirLogin();
  const rows = (await sql(`select ${COLS} from lancamentos order by data, created_at`)) as Row[];
  return rows.map(fromRow);
}

export async function inserir(entrada: NovoLancamento): Promise<Lancamento> {
  await exigirLogin();
  const e = validar(entrada);
  const rows = (await sql(
    `insert into lancamentos (data, qtde, descricao, valor_unitario, comissao) values ($1, $2, $3, $4, $5) returning ${COLS}`,
    [e.data, e.qtde, e.descricao, e.valor_unitario, e.comissao],
  )) as Row[];
  return fromRow(rows[0]);
}

export async function inserirVarios(lista: NovoLancamento[]): Promise<number> {
  await exigirLogin();
  if (!Array.isArray(lista) || lista.length > 1000) throw new Error("Lote inválido");
  const v = lista.map(validar);
  if (!v.length) return 0;
  await sql(
    `insert into lancamentos (data, qtde, descricao, valor_unitario, comissao)
     select * from unnest($1::date[], $2::numeric[], $3::text[], $4::numeric[], $5::numeric[])`,
    [v.map((x) => x.data), v.map((x) => x.qtde), v.map((x) => x.descricao), v.map((x) => x.valor_unitario), v.map((x) => x.comissao)],
  );
  return v.length;
}

export async function atualizar(id: string, entrada: NovoLancamento): Promise<Lancamento> {
  await exigirLogin();
  if (!UUID.test(id)) throw new Error("Id inválido");
  const e = validar(entrada);
  const rows = (await sql(
    `update lancamentos set data = $2, qtde = $3, descricao = $4, valor_unitario = $5, comissao = $6 where id = $1 returning ${COLS}`,
    [id, e.data, e.qtde, e.descricao, e.valor_unitario, e.comissao],
  )) as Row[];
  if (!rows.length) throw new Error("Lançamento não encontrado");
  return fromRow(rows[0]);
}

export async function excluir(ids: string[]): Promise<void> {
  await exigirLogin();
  if (!Array.isArray(ids) || !ids.every((i) => UUID.test(i))) throw new Error("Ids inválidos");
  if (ids.length) await sql(`delete from lancamentos where id = any($1::uuid[])`, [ids]);
}

export async function excluirTodos(): Promise<void> {
  await exigirLogin();
  await sql(`delete from lancamentos`);
}
