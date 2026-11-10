# Comissões · Clínica Agromaxxi

Sistema para lançar comissões, importar a planilha do Excel, gerar PDF para validação e exportar Excel como backup.

Feito com Next.js 15 (App Router + Server Actions) e banco Postgres no **Neon**. Todo acesso ao banco acontece no servidor: a string de conexão nunca chega ao navegador. Cada lançamento é um registro separado, então o histórico pode crescer sem limite prático.

---

## Passo 1 — Criar o banco no Neon (gratuito)

1. Crie uma conta em https://neon.tech e um projeto. Escolha a região **AWS São Paulo (sa-east-1)**.
2. Abra **SQL Editor**, cole todo o conteúdo de `db/schema.sql` e clique em **Run**.
3. Clique em **Connect** e copie a **Connection string** (começa com `postgresql://` e termina com `?sslmode=require`).

## Passo 2 — Publicar na Vercel (gratuito)

1. Suba esta pasta para um repositório **privado** no GitHub.
2. Em https://vercel.com, clique em **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione as três variáveis:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon |
| `APP_PASSWORD` | a senha que você vai usar para entrar no sistema |
| `AUTH_SECRET` | uma chave aleatória com pelo menos 32 caracteres (gere em https://generate-secret.vercel.app/32 ou com `openssl rand -hex 32`) |

4. Clique em **Deploy**. Em cerca de 1 minuto você recebe o endereço (ex.: `comissoes-agromaxxi.vercel.app`).

> Atalho: na Vercel, em **Storage → Neon**, dá para criar o banco direto pela Vercel. Ela já cadastra a `DATABASE_URL` sozinha. Depois rode o `db/schema.sql` no SQL Editor do Neon do mesmo jeito.

**Para trocar a senha:** altere `APP_PASSWORD` na Vercel e faça um redeploy. Para desconectar todos os aparelhos logados, troque também o `AUTH_SECRET`.

## Rodar no computador (opcional)

Requer Node.js 18.18 ou superior.

```bash
cp .env.example .env.local   # e preencha as três variáveis
npm install
npm run dev                  # abre em http://localhost:3000
```

## Estrutura

```
src/
├── app/                 layout, página (Server Component) e estilos
├── actions/             Server Actions: login/logout e CRUD dos lançamentos
├── components/          Login, Comissoes (tela principal), Dialog
└── lib/                 db (Neon), auth (sessão por cookie assinado), planilha
                         (importar/exportar), pdf, máscaras, formatação, serviços
db/schema.sql            criação da tabela
```

## Segurança

- Login por senha única, com sessão de 30 dias em cookie `httpOnly` assinado (HMAC-SHA256).
- Toda Server Action confere a sessão antes de tocar no banco.
- Os dados são validados de novo no servidor (data, valores, comissão de 0 a 100%), e as consultas usam parâmetros, sem concatenar texto.

## Funcionalidades

- Lançamento com máscaras (data, quantidade, R$, %), validação e prévia do total/líquido.
- Ao escolher um serviço já lançado, preenche o último valor e a comissão usados.
- Editar e excluir lançamentos, excluir os do período filtrado ou todos.
- Importar a planilha no formato atual (DATA, QTDE, DESCRIÇÃO, VALOR UNITÁRIO, COMISSÃO), adicionando ou substituindo.
- Gerar PDF do período filtrado, com totais e espaço para assinatura.
- Exportar Excel no mesmo formato da planilha (backup que pode ser reimportado).
