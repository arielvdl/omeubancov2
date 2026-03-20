# Cloudflare API Proxy - O Meu Banco

Documentacao da configuracao do dominio customizado `api.omeubanco.xyz` para o backend.

---

## Arquitetura

```
App iOS / Cliente HTTP
        |
        v
api.omeubanco.xyz (Cloudflare DNS + Proxy)
        |
        v
Cloudflare Worker (omeubanco-api-proxy)
  - Reescreve Host header
  - Adiciona CORS headers
        |
        v
omeubanco-api-548984743318.southamerica-east1.run.app (Google Cloud Run)
```

## Por que um Worker?

O Cloud Run usa o header `Host` para rotear requests. Com o proxy do Cloudflare ativado, o header chega como `api.omeubanco.xyz` (que o Cloud Run nao reconhece). O Worker reescreve o header para o hostname original do Cloud Run.

A alternativa seria o "Host Header Override" nas Origin Rules, mas requer plano pago do Cloudflare.

---

## Componentes

### 1. DNS (Cloudflare)

| Tipo | Nome | Destino | Proxy |
|------|------|---------|-------|
| CNAME | api | omeubanco-api-548984743318.southamerica-east1.run.app | Com proxy (nuvem laranja) |

### 2. Worker (`omeubanco-api-proxy`)

- **Localizacao:** `/cloudflare-worker/`
- **Rota:** `api.omeubanco.xyz/*`
- **Funcao:** Proxy reverso com Host header override
- **Limite free:** 100.000 requests/dia

**Deploy:**
```bash
cd cloudflare-worker
wrangler deploy
```

**Arquivos:**
- `wrangler.toml` - Configuracao (rota, env vars)
- `src/index.ts` - Codigo do worker

### 3. SSL/TLS

- **Modo:** Completo (Full)
- **Certificado:** Wildcard `*.omeubanco.xyz` (Let's Encrypt via Cloudflare)
- **TLS:** v1.3

### 4. Backend (Cloud Run)

- **Servico:** `omeubanco-api`
- **Regiao:** `southamerica-east1`
- **URL direta:** `https://omeubanco-api-548984743318.southamerica-east1.run.app`
- **URL publica:** `https://api.omeubanco.xyz`

---

## Configuracoes relacionadas

### Frontend (`.env.production`)
```
EXPO_PUBLIC_API_URL=https://api.omeubanco.xyz/api/v1
```

### Backend (`backend/src/config/index.ts`)
```
RP_ID: api.omeubanco.xyz
RP_ORIGIN: https://api.omeubanco.xyz
```

### iOS Passkeys (`app.json` + entitlements)
```
associatedDomains: [
  "webcredentials:api.omeubanco.xyz",
  "webcredentials:omeubanco-api-548984743318.southamerica-east1.run.app"
]
```
O dominio antigo e mantido para compatibilidade com passkeys ja registradas.

---

## Endpoints

Todos os endpoints do backend sao acessiveis via `https://api.omeubanco.xyz`:

| Caminho | Descricao |
|---------|-----------|
| `/health` | Health check |
| `/.well-known/apple-app-site-association` | AASA para Passkeys |
| `/api/v1/auth/*` | Autenticacao (login, register, Google OAuth, Passkeys) |
| `/api/v1/families/*` | Gestao de familias |
| `/api/v1/children/*` | Filhos + transacoes + agendamentos + contratos + analytics + wishlist |
| `/api/v1/invitations/*` | Convites de guardioes |
| `/api/v1/guardians/*` | Guardioes |
| `/api/v1/upload/*` | Upload de imagens (avatar, comprovante, wishlist) |
| `/api/v1/subscription/*` | Assinaturas RevenueCat |
| `/api/internal/cron/*` | Cron jobs (requer X-Cron-Secret) |
| `/auth/google/*` | OAuth callbacks |
| `/webhooks/revenuecat` | Webhook RevenueCat |

---

## Troubleshooting

### API retorna 522 ou 524
O Cloud Run pode estar cold-starting. Aguardar e tentar novamente.

### CORS bloqueado
O Worker adiciona headers CORS. Se mudar, editar `cloudflare-worker/src/index.ts`.

### Passkeys nao funcionam
Verificar que o AASA esta acessivel: `curl https://api.omeubanco.xyz/.well-known/apple-app-site-association`

### Alterar URL do backend
1. Atualizar `ORIGIN_HOST` em `cloudflare-worker/wrangler.toml`
2. `cd cloudflare-worker && wrangler deploy`

---

## Data de configuracao

2026-03-19 - Configuracao inicial por Claude Code
