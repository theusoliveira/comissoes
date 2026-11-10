export interface Lancamento {
  id: string;
  data: string;          // ISO yyyy-mm-dd
  qtde: number;
  descricao: string;
  valor_unitario: number;
  comissao: number;      // percentual 0–100
}

export type NovoLancamento = Omit<Lancamento, "id">;

export interface Row {
  id: string; data: string; qtde: number | string; descricao: string;
  valor_unitario: number | string; comissao: number | string;
}

/** Postgres devolve numeric como string; normaliza para number. */
export function fromRow(r: Row): Lancamento {
  return {
    id: r.id, data: r.data, descricao: r.descricao,
    qtde: Number(r.qtde), valor_unitario: Number(r.valor_unitario), comissao: Number(r.comissao),
  };
}
