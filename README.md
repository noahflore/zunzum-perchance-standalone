# zunzum (espelho GitHub Pages do app Perchance)

App funcionando em: https://perchance.org/zunzum — este espelho usa o MESMO banco e backend.

## Quero forkar / montar o meu

Troque no index.html os 3 valores inline e aponte p/ o SEU backend:
- window.ZUN_SUPABASE_URL / window.ZUN_SUPABASE_KEY (publishable do SEU projeto Supabase; rode os .sql do backup p/ criar as tabelas+RLS)
- window.ZUN_BACKEND_URL (o SEU app no Bonto, com as envs JWT_SECRET + CORS_EXTRA da sua origem)
Sem isso, seu fork lê/escreve no banco do zunzum original (feed público via RLS) e o login falha (CORS do Bonto barra origem desconhecida).
