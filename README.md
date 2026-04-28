# aircraft-history

Aplicação Next.js (App Router) para consulta do histórico de aeronaves por matrícula (MARCA), com detecção de negociações por mudança de proprietário.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- ESLint
- Supabase JS Client

## Variáveis de ambiente

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

2. Preencha as variáveis no arquivo `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública (anon) do Supabase.
- `NEXT_PUBLIC_AIRCRAFT_TABLE_NAME`: nome da tabela com as colunas:
  - `data_registro` (text)
  - `marca` (text)
  - `proprietario` (text)
  - `operador` (text)

> Importante: não use a **service role key** no frontend.

## Como rodar localmente

```bash
npm install
npm run dev
```

A aplicação estará em [http://localhost:3000](http://localhost:3000).

## Fluxo da página

1. Digite a matrícula (ex.: `PR-ABC`) e clique em **Buscar**.
2. O input é normalizado (`trim` + `uppercase`) antes da consulta.
3. A busca roda no Supabase com ordenação por `data_registro` crescente.
4. A tela mostra:
   - Histórico completo mês a mês (`data_registro`, `proprietario`, `operador`)
   - Seção **Negociações Detectadas** quando houver mudança de proprietário.

## Build de produção

```bash
npm run build
npm run start
```

## Deploy (depois)

Você pode fazer deploy em plataformas como Vercel, Netlify ou infraestrutura própria com Node.js.

Passos gerais:

1. Configurar as mesmas variáveis de ambiente no provedor.
2. Executar `npm run build` no pipeline.
3. Publicar com `npm run start` (ou fluxo equivalente do provedor).
