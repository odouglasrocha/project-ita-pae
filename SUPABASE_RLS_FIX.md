# 🔴 Diagnóstico: Histórico não carrega em Vercel

## Problema Identificado

Mesmo com as variáveis de ambiente configuradas, o histórico não carrega. **A causa é Row Level Security (RLS) do Supabase**.

### Por Que RLS Bloqueia?

1. **Local (localhost:8080):** Funciona porque você usa `VITE_SUPABASE_SERVICE_ROLE_KEY` em desenvolvimento
2. **Vercel:** Usa `VITE_SUPABASE_ANON_KEY` (role `anon`), que não tem permissão de leitura

```
┌─────────────────┐
│ Local Dev       │
│ SERVICE_ROLE    │──> ✅ Pode ler tudo
│ (admin)         │
└─────────────────┘

┌─────────────────┐
│ Vercel Prod     │
│ ANON_KEY        │──> ❌ Bloqueado por RLS
│ (guest)         │
└─────────────────┘
```

---

## Solução: Desabilitar ou Criar Policies no RLS

### Opção A: Desabilitar RLS (Mais Simples, Menos Seguro)

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Execute este comando:

```sql
ALTER TABLE public.inspection_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_result_fields DISABLE ROW LEVEL SECURITY;
```

4. Salve (Execute)
5. Teste em Vercel - deve funcionar

### Opção B: Criar Policies Públicas (Recomendado)

Mantém RLS ativado mas permite acesso público:

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor**
3. Copie e execute o conteúdo de [`scripts/fix-rls.sql`](scripts/fix-rls.sql)
4. Teste em Vercel - deve funcionar

---

## Como Verificar o Problema

Abra o **DevTools do Navegador** (F12) em Vercel e verifique o console:

### Se o erro for 403 Forbidden:
```
Error: "JWT token does not have permission to access table inspection_results"
```
→ **Solução:** Aplicar uma das opções acima

### Se o erro for 401 Unauthorized:
```
Error: "Invalid API Key"
```
→ **Solução:** Verificar se `VITE_SUPABASE_ANON_KEY` foi copiada corretamente

### Se não houver erro e dados aparecerem:
✅ **Problema resolvido!**

---

## Verificação Rápida

Teste executando este comando no console do navegador (em Vercel):

```javascript
fetch('https://obozbmqszuclsaiupqnw.supabase.co/rest/v1/inspection_results?limit=1', {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ib3pibXFzenVjbHNhaXVwcW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDY4NzEsImV4cCI6MjA5ODQ4Mjg3MX0.dSkLRe-B4fgKx1W1Z7NshN96bQA7nUchg01loGmJSWc',
  }
}).then(r => r.json()).then(console.log)
```

- **Status 200:** ✅ RLS OK
- **Status 403:** ❌ RLS bloqueando
- **Status 401:** ❌ Chave inválida
