# RevenueCat — Configuracao de Assinaturas

## Arquitetura

```
App (react-native-purchases) → Apple IAP / Google Play
       ↓
RevenueCat (valida receipts, gerencia entitlements)
       ↓ webhooks
Backend Hono.js → PostgreSQL (subscriptions table)
```

## Modelo de Negocio

| Feature | Gratuito | Familia R$9,90/mes | Familia+ R$14,90/mes |
|---|---|---|---|
| Criancas | 1 | Ate 3 | Ate 5 |
| Fotos comprovante | Ate 3 total | Ilimitadas | Ilimitadas |
| Lista de desejos | Ate 10 itens | Ilimitados | Ilimitados |
| Agendamento | Apenas mensal | Diario/semanal/mensal | Diario/semanal/mensal |
| Convidar guardioes | Nao | Sim | Sim |
| Sem publicidade | Nao | Sim | Sim |
| Plano anual | - | R$89,90/ano | R$139,90/ano |

## Produtos no App Store Connect

| Product ID | Nome | Preco | Duracao |
|---|---|---|---|
| `familia_monthly` | Familia Mensal | R$ 9,90 | 1 mes |
| `familia_yearly` | Familia Anual | R$ 89,90 | 1 ano |
| `familia_plus_monthly` | Familia+ Mensal | R$ 14,90 | 1 mes |
| `familia_plus_yearly` | Familia+ Anual | R$ 139,90 | 1 ano |

Subscription Group: `omeubanco_plans`

## Entitlements no RevenueCat

| Entitlement | Produtos vinculados |
|---|---|
| `familia` | `familia_monthly`, `familia_yearly` |
| `familia_plus` | `familia_plus_monthly`, `familia_plus_yearly` |

## Offerings

Offering `default` com 4 packages:
- `familia_monthly` → produto `familia_monthly`
- `familia_yearly` → produto `familia_yearly`
- `familia_plus_monthly` → produto `familia_plus_monthly`
- `familia_plus_yearly` → produto `familia_plus_yearly`

## Configuracao do Projeto

- **Bundle ID**: `com.omeubanco-app`
- **Platform**: Apple App Store (iOS)
- **SDK**: `react-native-purchases` com StoreKit 2
- **RevenueCat Project ID**: `0fb27518`
- **RevenueCat Dashboard**: `https://app.revenuecat.com/projects/0fb27518`

## Apps no RevenueCat

| App | Tipo | Public API Key |
|---|---|---|
| Test Store | Teste/sandbox | `test_mckdCJkjTTZWFFjLIJfIrSIknZf` |
| O Meu Banco (App Store) | Producao iOS | `appl_oqxAGSndxMFKnKDrPbXjpNImqSn` |

## Chave In-App Purchase (App Store Connect)

- **Nome da chave**: RevenueCat
- **Key ID**: `ZZ7869UTWM`
- **Issuer ID**: `2b55979c-2087-41d1-a695-0a98f6865220`
- **Arquivo .p8**: `SubscriptionKey_ZZ7869UTWM.p8` (baixado uma unica vez, guardar em local seguro)
- **Configurado em**: App Store Connect → Utilizadores e acesso → Integracoes → Compra integrada
- **Upload feito no RevenueCat**: Apps & providers → O Meu Banco (App Store)

> O arquivo .p8 so pode ser baixado UMA vez do App Store Connect. Se perder, sera necessario gerar uma nova chave.

## Variaveis de Ambiente

### Frontend (.env / .env.production)
```
# Desenvolvimento (usa Test Store)
EXPO_PUBLIC_REVENUECAT_API_KEY=test_mckdCJkjTTZWFFjLIJfIrSIknZf

# Producao (usa App Store real) — definido em .env.production
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_oqxAGSndxMFKnKDrPbXjpNImqSn
```

### Backend (backend/.env)
```
REVENUECAT_WEBHOOK_SECRET=<webhook_secret>
```

> NUNCA commitar chaves reais no git. Apenas .env.example com placeholders.

## Webhook

- **URL**: `https://api.omeubanco.xyz/webhooks/revenuecat`
- **Auth**: Bearer token via `REVENUECAT_WEBHOOK_SECRET`
- **Eventos tratados**:
  - `INITIAL_PURCHASE` → upsert subscription ativa
  - `RENEWAL` → upsert subscription ativa
  - `PRODUCT_CHANGE` → atualiza entitlement
  - `CANCELLATION` → deactivate + pausa schedules daily/weekly
  - `EXPIRATION` → deactivate + pausa schedules daily/weekly

## Inicializacao no App

O SDK e inicializado em `app/_layout.tsx`:
1. `Purchases.configure({ apiKey })` — na preparacao do app
2. `Purchases.logIn(familyId)` — apos hydration com token valido

## Gating Points (Backend)

| Rota | Check | Resposta se bloqueado |
|---|---|---|
| POST `/api/v1/children` | `checkChildLimit()` | 403 `subscription_required` |
| POST `/api/v1/upload/receipt` | `checkReceiptLimit()` | 403 `subscription_required` |
| POST `/api/v1/children/:id/schedules` | `checkFrequencyAllowed()` | 403 `subscription_required` |
| POST `/api/v1/invitations` | `checkGuardianInviteAllowed()` | 403 `subscription_required` |
| POST `/api/v1/children/:id/wishlist` | `checkWishItemLimit()` | 403 `subscription_required` |

## Gating Points (Frontend)

| Tela | Check | Componente |
|---|---|---|
| family-members.tsx | `canAddChild()` | PaywallPrompt |
| family-members.tsx | `canInviteGuardian()` | PaywallPrompt |
| withdraw.tsx | `canUploadReceipt()` | PaywallPrompt |
| schedule.tsx | `canUseFrequency()` | Lock icon + redirect paywall |
| wishlist.tsx | `canAddWishItem()` | Redirect paywall no FAB |

## Sandbox Testing

1. App Store Connect → Users → Sandbox → criar tester
2. iPhone → Settings → App Store → Sandbox Account
3. Renovacao sandbox: mensal = 5 min, anual = 1h

## Checklist de Deploy

- [x] Chave .p8 gerada no App Store Connect (Key ID: ZZ7869UTWM)
- [x] App iOS criado no RevenueCat com .p8, Key ID e Issuer ID
- [x] `EXPO_PUBLIC_REVENUECAT_API_KEY` em `.env.production` com key `appl_...`
- [ ] Produtos criados no App Store Connect (4 subscriptions no grupo `omeubanco_plans`)
- [ ] Entitlements configurados no RevenueCat (familia, familia_plus)
- [ ] Offering `default` configurado com 4 packages
- [ ] Webhook apontando para `https://api.omeubanco.xyz/webhooks/revenuecat`
- [ ] `REVENUECAT_WEBHOOK_SECRET` no backend .env de producao
- [ ] Migration `0004_sturdy_roland_deschain.sql` aplicada no banco
- [ ] Sandbox tester criado no App Store Connect para testes
- [ ] Testar compra sandbox no TestFlight

## Como Reconfigurar (se necessario)

1. **Gerar nova chave .p8**: App Store Connect → Utilizadores e acesso → Integracoes → Compra integrada → Gerar chave
2. **Atualizar no RevenueCat**: Apps & providers → O Meu Banco (App Store) → editar In-app purchase key
3. **API Keys do RevenueCat**: Dashboard → API keys (as public keys `appl_...` sao geradas automaticamente por app)
4. **Atualizar .env.production**: trocar o valor de `EXPO_PUBLIC_REVENUECAT_API_KEY`
5. **Rebuild**: `npx expo prebuild --clean --platform ios` + xcodebuild (ver docs/TESTFLIGHT.md)
