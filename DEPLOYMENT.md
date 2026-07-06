# 🚀 Configuração de Deployment - Vercel

## Problema: Histórico não carrega em Vercel

O histórico não carrega em produção (Vercel) porque as variáveis de ambiente do Supabase não estão configuradas.

## Solução: Configurar Variáveis de Ambiente no Vercel

### Passo 1: Acessar o Dashboard do Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Vá para seu projeto
3. Clique em **Settings** (Configurações)
4. Acesse a aba **Environment Variables** (Variáveis de Ambiente)

### Passo 2: Adicionar Variáveis

Adicione as seguintes variáveis com seus valores do `.env.local`:

| Variável | Valor | De onde pegar |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://obozbmqszuclsaiupqnw.supabase.co` | Arquivo `.env.local` linha 1 |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` | Arquivo `.env.local` linha 2 |

**IMPORTANTE:** Copie os valores EXATAMENTE como estão em `.env.local`.

### Passo 3: Redeploy

1. Na aba **Deployments**, clique no último deployment
2. Clique em **Redeploy** ou **Redeploy with existing cache**
3. Aguarde o redeploy completar
4. Teste acessando a página de histórico

## Verificar se Está Funcionando

Após redeploy:
1. Abra o navegador (acesse seu app no Vercel)
2. Vá para a página de Histórico
3. Verifique se os dados estão carregando
4. Se não carregar, abra o DevTools (F12) → Console e procure por erros com `[Supabase]`

## Segurança

⚠️ **Importante:**
- `.env.local` contém credenciais sensíveis - NUNCA commite para o Git
- O arquivo `.gitignore` foi atualizado para `*.local` para proteger esses arquivos
- Se expôs as chaves no Git, [reforce as regras do RLS no Supabase](https://supabase.com/docs/guides/auth/row-level-security)

## Troubleshooting

| Sintoma | Solução |
|---|---|
| "Carregando..." infinitamente | Variáveis não estão configuradas no Vercel → Siga Passo 2 |
| Erro "Unauthorized" | Chave copiada incorretamente → Recopia de `.env.local` |
| Erro "Connection refused" | Problema de conectividade → Verifique status do Supabase |
| Histórico vazio | Funcionando corretamente, sem dados salvos ainda |

