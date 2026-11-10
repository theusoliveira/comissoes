-- Rode este script no Neon: Console > SQL Editor
create table if not exists lancamentos (
  id             uuid primary key default gen_random_uuid(),
  data           date not null,
  qtde           numeric(10,2) not null check (qtde > 0),
  descricao      text not null check (char_length(descricao) between 1 and 120),
  valor_unitario numeric(12,2) not null check (valor_unitario >= 0),
  comissao       numeric(5,2)  not null check (comissao between 0 and 100),
  created_at     timestamptz not null default now()
);

create index if not exists lancamentos_data_idx on lancamentos (data);
