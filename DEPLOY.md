# Deploy — Local e Vercel

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores (já feito para o projeto `pae`):

| Variável | Onde é usada | Cliente? |
|---|---|---|
| `VITE_SUPABASE_URL` | Client Supabase | ✅ sim |
| `VITE_SUPABASE_ANON_KEY` | Client Supabase (publishable) | ✅ sim |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Server-only (admin) | ❌ não |
| `SUPABASE_JWT_SECRET` | Server-only | ❌ não |

> ⚠️ Variáveis com prefixo `VITE_` são embutidas no bundle e ficam visíveis no navegador. Não coloque segredos aí — apenas chaves publishable.

## Rodar localmente

```bash
bun install
bun run dev
```

Acesse `http://localhost:8080`.

## Deploy no Vercel

1. Importe o repositório no Vercel.
2. Em **Project Settings → Environment Variables**, adicione **todas** as chaves do `.env` para os ambientes *Production*, *Preview* e *Development*.
3. O `vercel.json` já define:
   - Install: `bun install`
   - Build: `bun run build`
   - Output: `.output/public`
4. Faça o deploy — Vercel detecta o Nitro/TanStack Start automaticamente.

Após o primeiro deploy, qualquer push na branch principal republica em produção.
