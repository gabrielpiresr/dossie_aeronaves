# aircraft-history

Base inicial de uma aplicação Next.js para consulta de histórico de aeronaves.

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
- `NEXT_PUBLIC_AIRCRAFT_TABLE_NAME`: nome da tabela que será usada futuramente para histórico.

> Importante: não use a **service role key** no frontend.

## Como rodar localmente

```bash
npm install
npm run dev
```

Depois, abra [http://localhost:3000](http://localhost:3000).

## Build de produção

```bash
npm run build
npm run start
```

## Deploy (próximos passos)

Você pode fazer deploy em plataformas como Vercel, Netlify ou infraestrutura própria com Node.js.

Fluxo recomendado:

1. Configurar as mesmas variáveis de ambiente da sua máquina local na plataforma de deploy.
2. Executar `npm run build` no pipeline.
3. Publicar o app usando `npm run start` (ou adaptando ao provedor).

---

Atualmente, o client do Supabase já está configurado em `lib/supabase.ts`, mas ainda não há consulta real implementada.
