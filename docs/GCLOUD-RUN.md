# Google Cloud Run - O Meu Banco

Documentacao da configuracao e deploy dos servicos `omeubanco-website` e `omeubanco-api` no Google Cloud.

---

## Projeto

| Campo | Valor |
|-------|-------|
| Projeto GCP | `omeubanco` |
| Conta usada no deploy | `invoicegotas@gmail.com` |
| CLI | `gcloud` |

Antes de fazer deploy:

```bash
gcloud auth login
gcloud config set project omeubanco
```

---

## Servicos Cloud Run

| Servico | Regiao | URL Cloud Run |
|---------|--------|---------------|
| `omeubanco-website` | `us-central1` | `https://omeubanco-website-konhqbq7qq-uc.a.run.app` |
| `omeubanco-api` | `southamerica-east1` | `https://omeubanco-api-konhqbq7qq-rj.a.run.app` |

URLs publicas esperadas:

| Host | Servico |
|------|---------|
| `https://omeubanco.xyz` | `omeubanco-website` |
| `https://api.omeubanco.xyz` | `omeubanco-api` |

---

## Deploy do Website

O website usa Next.js com `output: "export"` e e servido por Nginx no Cloud Run.

```bash
cd website
npm run build
gcloud run deploy omeubanco-website \
  --project omeubanco \
  --region us-central1 \
  --source . \
  --allow-unauthenticated
```

Arquivos relevantes:

- `website/Dockerfile` - imagem Nginx que copia `out/`
- `website/nginx.conf` - clean URLs, headers de seguranca, `Link` headers e Markdown negotiation
- `website/.gcloudignore` - reduz o contexto enviado para Cloud Build

Depois do deploy, validar:

```bash
curl -I https://omeubanco.xyz/
curl https://omeubanco.xyz/ -H "Accept: text/markdown"
curl -I https://omeubanco.xyz/.well-known/api-catalog
```

---

## Deploy da API

O backend usa Hono/Node.js e e empacotado pelo `backend/Dockerfile`.

```bash
cd backend
gcloud run deploy omeubanco-api \
  --project omeubanco \
  --region southamerica-east1 \
  --source . \
  --allow-unauthenticated
```

### Variaveis obrigatorias da API

O servico deve manter as secrets existentes e a allowlist de CORS sem wildcard:

```bash
gcloud run services update omeubanco-api \
  --project omeubanco \
  --region southamerica-east1 \
  --update-env-vars='^|^CORS_ORIGIN=https://omeubanco.xyz,https://www.omeubanco.xyz,https://omeubanco-website-548984743318.us-central1.run.app,https://omeubanco-website-konhqbq7qq-uc.a.run.app'
```

Secrets ja configuradas no Cloud Run:

- `DATABASE_URL`
- `JWT_SECRET`
- `CRON_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Arquivos relevantes:

- `backend/Dockerfile` - build TypeScript e imagem Node.js de producao
- `backend/.gcloudignore` - exclui `node_modules`, `dist` e envs locais

Depois do deploy, validar:

```bash
curl https://api.omeubanco.xyz/health
curl -I https://api.omeubanco.xyz/api/v1/subscription
curl https://api.omeubanco.xyz/.well-known/oauth-protected-resource
```

---

## Endpoints Principais da API

Todos os endpoints do backend sao acessiveis via `https://api.omeubanco.xyz`:

| Caminho | Descricao |
|---------|-----------|
| `/health` | Health check |
| `/.well-known/apple-app-site-association` | AASA para Passkeys |
| `/.well-known/oauth-protected-resource` | Metadata do recurso protegido para descoberta por clientes OAuth-aware |
| `/api/v1/auth/*` | Autenticacao (login, register, Google OAuth, Passkeys) |
| `/api/v1/families/*` | Gestao de familias |
| `/api/v1/children/*` | Filhos + transacoes + agendamentos + contratos + analytics + wishlist |
| `/api/v1/invitations/*` | Convites de guardioes |
| `/api/v1/guardians/*` | Guardioes |
| `/api/v1/upload/*` | Upload de imagens (avatar, comprovante, wishlist) |
| `/api/v1/subscription/*` | Assinaturas RevenueCat |
| `/api/internal/cron/*` | Cron jobs internos |
| `/auth/google/*` | OAuth callbacks |
| `/webhooks/revenuecat` | Webhook RevenueCat |

---

## Troubleshooting

### API retorna erro de permissao ou CORS

Verifique as variaveis de ambiente do servico:

```bash
gcloud run services describe omeubanco-api \
  --project omeubanco \
  --region southamerica-east1
```

### Website nao reflete mudancas

Confirme que `npm run build` foi executado antes do deploy e que `website/out/` foi atualizado.

### Cloud Build falha no deploy do website

Verifique se `website/out/`, `website/Dockerfile` e `website/nginx.conf` existem antes de chamar `gcloud run deploy --source .`.
