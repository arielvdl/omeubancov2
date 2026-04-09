# Push Notifications

Sistema de notificações push do O Meu Banco via Expo Push API.

## Arquitetura

```
App (Expo) ──► POST /api/v1/devices ──► Backend ──► DB (devices table)
                                                        │
Cron / Evento ──► notificationService ──► Expo Push API ─┘
                                              │
                                         Apple APNs / Google FCM
                                              │
                                         Dispositivo do usuario
```

## Registro de Dispositivo

O app registra o push token automaticamente ao fazer login (`app/_layout.tsx`):

1. `useNotifications(!!token)` — ativa quando autenticado
2. `registerForPushNotifications()` — pede permissao ao OS
3. `Notifications.getExpoPushTokenAsync()` — gera o Expo Push Token
4. `POST /api/v1/devices` — registra no backend com `familyId`, `platform`, `pushToken`

Se o usuario negar a permissao, o token nao e gerado e nenhum push sera recebido.

## Gatilhos Automaticos

| Evento | Titulo | Corpo | Data Type | Arquivo |
|--------|--------|-------|-----------|---------|
| Mesada automatica | `Mesada depositada` | `Deposito automatico de R$X para {crianca}` | `scheduled_deposit` | `scheduled-deposit.service.ts:74` |
| Meta atingida (mesada) | `{crianca} atingiu a meta!` | `O saldo alcancou R$X para "{item}"` | `goal_reached` | `scheduled-deposit.service.ts:91` |
| Meta atingida (deposito manual) | `{crianca} atingiu a meta!` | `O saldo alcancou R$X para "{item}"` | `goal_reached` | `transactions.routes.ts:74` |
| Guardian aceita convite | `Novo membro na familia!` | `{nome} ({role}) aceitou o convite` | `invitation_accepted` | `auth.routes.ts:431` |
| Guardian aceita convite (Google) | `Novo membro na familia!` | `{nome} ({role}) aceitou o convite` | `invitation_accepted` | `auth.routes.ts:581` |

Todos os pushes sao enviados de forma assincrona (fire & forget com `.catch()` para nao bloquear a operacao principal).

## Envio Manual (API Interna)

### Endpoint: `POST /api/internal/cron/push-broadcast`

Requer header `X-Cron-Secret` para autenticacao.

**Broadcast para todos:**
```bash
curl -X POST https://omeubanco-api-XXXX.run.app/api/internal/cron/push-broadcast \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: SEU_CRON_SECRET" \
  -d '{
    "title": "Novidade!",
    "body": "Confira as novidades do app"
  }'
```

**Para familias especificas:**
```bash
curl -X POST https://omeubanco-api-XXXX.run.app/api/internal/cron/push-broadcast \
  -H "Content-Type: application/json" \
  -H "X-Cron-Secret: SEU_CRON_SECRET" \
  -d '{
    "title": "Hora da mesada!",
    "body": "Nao esqueca de verificar o extrato dos seus filhos",
    "familyIds": ["267a51ce-b065-43ff-ac1e-157f4eac324c"]
  }'
```

### Campos do body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `title` | string | sim | Titulo da notificacao |
| `body` | string | sim | Corpo da mensagem |
| `data` | object | nao | Dados extras (ex: `{ type: "promo" }`) |
| `familyIds` | string[] | nao | Se vazio, envia para todos |

## Envio Manual (Script Local)

Para enviar push diretamente consultando o banco de producao:

### Pre-requisitos

1. `gcloud` autenticado no projeto `omeubanco`
2. `cloud-sql-proxy` instalado (`brew install cloud-sql-proxy`)

### Passo a passo

```bash
# 1. Iniciar Cloud SQL Proxy (porta 5433 para nao conflitar com local)
cloud-sql-proxy "omeubanco:southamerica-east1:omeubanco-db" --port=5433 &

# 2. Obter credenciais do banco
DB_URL=$(gcloud secrets versions access latest --secret=database-url)

# 3. Criar e rodar script (ver exemplo abaixo)
npx tsx scripts/send-push.ts

# 4. Parar o proxy
pkill -f "cloud-sql-proxy.*omeubanco"
```

### Exemplo de script (`scripts/send-push.ts`)

```typescript
import { execSync } from 'child_process';
import postgres from 'postgres';

const socketUrl = execSync(
  'gcloud secrets versions access latest --secret=database-url',
  { encoding: 'utf8' }
).trim();

const match = socketUrl.match(/\/\/([^:]+):([^@]+)@\/([^?]+)/);
if (!match) process.exit(1);

const [, user, password, database] = match;
const sql = postgres({ host: 'localhost', port: 5433, username: user, password, database });

async function main() {
  // Buscar familia por email
  const families = await sql`
    SELECT id, name FROM families
    WHERE email = 'arieldj@gmail.com' OR google_email = 'arieldj@gmail.com'
    LIMIT 1
  `;
  if (families.length === 0) { console.error('Family not found'); process.exit(1); }

  const family = families[0];

  // Buscar devices da familia
  const devices = await sql`
    SELECT push_token FROM devices WHERE family_id = ${family.id}
  `;
  if (devices.length === 0) { console.error('No devices'); process.exit(1); }

  // Enviar via Expo Push API
  const messages = devices.map((d: any) => ({
    to: d.push_token,
    title: 'Hora da mesada!',
    body: 'Nao esqueca de verificar o extrato dos seus filhos',
    sound: 'default',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  console.log(await res.json());
  await sql.end();
}

main();
```

## Notification Service (Backend)

Localizado em `backend/src/services/notification.service.ts`:

| Metodo | Descricao |
|--------|-----------|
| `sendToDevice(pushToken, title, body, data?)` | Envia para 1 dispositivo |
| `sendToFamily(familyId, title, body, data?)` | Envia para todos os devices de uma familia |
| `sendToFamilies(familyIds[], title, body, data?)` | Envia para multiplas familias |
| `sendToAll(title, body, data?)` | Broadcast para todos os devices |

Usa a Expo Push API (`https://exp.host/--/api/v2/push/send`) com batch de 100 mensagens por request.

## Tabela `devices`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Primary key |
| `family_id` | UUID | FK → families (cascade delete) |
| `child_id` | UUID | FK → children (nullable, cascade delete) |
| `push_token` | VARCHAR(500) | Expo Push Token (unique) |
| `platform` | VARCHAR(10) | `ios` ou `android` |
| `created_at` | TIMESTAMP | Data de registro |

## Troubleshooting

**Push nao chega:**
1. Verificar se o device esta registrado: consultar tabela `devices` com o `family_id`
2. Verificar se o push token e valido (formato `ExponentPushToken[...]`)
3. Verificar permissoes de notificacao no dispositivo (Ajustes > O Meu Banco > Notificacoes)
4. Em dev local, o Expo Go precisa do `projectId` configurado em `app.json > extra > eas > projectId`

**Device nao registra:**
1. Usuario negou permissao de notificacao
2. Token de auth expirado (o hook `useNotifications` depende de `!!token`)
3. `projectId` ausente no `app.json` (logs: `Missing Expo projectId`)
4. Erro silencioso no `POST /devices` (verificar logs do backend)
