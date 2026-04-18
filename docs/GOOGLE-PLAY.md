# Deploy para Google Play - O Meu Banco

Guia completo para configurar e distribuir o app via Google Play.

**Stack:** Expo SDK 54 + React Native 0.81
**Package Name:** `com.omeubanco.app`
**Metodo de build:** EAS Build (cloud)
**Formato:** AAB (Android App Bundle)

---

## 1. Criar conta Google Play Developer

1. Aceder a [play.google.com/console](https://play.google.com/console)
2. Fazer login com a conta Google da empresa
3. Pagar a taxa unica de **$25 USD**
4. Preencher os dados da organizacao:
   - Nome: E-Commerce Experience Servicos da Informatica LTDA
   - Email de contato: ariel@ecommerceexperience.co
   - Website: omeubanco.xyz
5. Verificar a identidade (pode levar 2-7 dias uteis para novas contas)

---

## 2. Criar o app no Google Play Console

1. Ir a **All apps** > **Create app**
2. Preencher:
   - **App name:** O Meu Banco
   - **Default language:** Portugues (Portugal) ou Portugues (Brasil)
   - **App or game:** App
   - **Free or paid:** Free (com IAP)
3. Aceitar as declaracoes e criar

---

## 3. Configurar o app listing

Antes de publicar, preencher:

- **Store listing:**
  - Descricao curta (max 80 chars)
  - Descricao completa (max 4000 chars)
  - Screenshots (min 2 por tipo de dispositivo)
  - Icone (512x512 PNG, sem transparencia)
  - Feature graphic (1024x500)
- **Content rating:** Preencher questionario IARC
- **Target audience:** Criancas (requer compliance com politicas de Family)
- **Privacy policy URL:** https://omeubanco.xyz/privacy
- **Data safety:** Preencher formulario de seguranca de dados

### Atencao: Politica de apps para criancas

O Google Play tem regras rigorosas para apps destinados a criancas:
- Compliance com COPPA/GDPR para menores
- Sem publicidade direcionada a criancas
- Controles parentais obrigatorios
- Declaracao no formulario de Target Audience

---

## 4. Configurar a Service Account para deploy automatizado

Para o EAS Submit funcionar, e necessaria uma Service Account:

1. No Google Play Console, ir a **Setup** > **API access**
2. Clicar em **Link a Google Cloud project** (ou criar novo)
3. No Google Cloud Console:
   - Ir a **IAM & Admin** > **Service Accounts**
   - Criar service account com nome: `eas-submit`
   - Dar a role: **Service Account User**
4. Voltar ao Google Play Console > **API access**:
   - Encontrar a service account criada
   - Clicar **Grant access**
   - Permissoes: **Release manager** (ou custom com permissao de upload)
   - Aplicar a todos os apps
5. Na service account, criar uma **JSON key**:
   - Descarregar o ficheiro JSON
   - Salvar como `google-play-service-account.json` na raiz do projeto
   - **IMPORTANTE:** Este ficheiro esta no `.gitignore` - NUNCA commitar

---

## 5. Configurar RevenueCat para Android

1. No [RevenueCat Dashboard](https://app.revenuecat.com):
   - Ir ao projeto O Meu Banco
   - **Project Settings** > **Apps** > **Add New App**
   - Selecionar **Google Play Store**
   - Inserir o package name: `com.omeubanco.app`
2. Configurar Google Play Billing:
   - No Google Play Console: **Monetize** > **Products** > **Subscriptions**
   - Criar os mesmos produtos que existem no iOS:
     - `omeubanco_familia_mensal`
     - `omeubanco_familia_anual`
     - `omeubanco_familia_plus_mensal`
     - `omeubanco_familia_plus_anual`
   - Configurar precos equivalentes ao iOS
3. Conectar Google Play ao RevenueCat:
   - No Google Play Console: **Monetize** > **Monetization setup**
   - Copiar a **License Key (Base64-encoded RSA public key)**
   - Colar no RevenueCat: App settings > Google Play Store credentials
   - Configurar Real-Time Developer Notifications (RTDN) com o topic do RevenueCat
4. Copiar a **Public API Key** do RevenueCat (comeca com `goog_`)
5. Adicionar ao `.env.production`:
   ```
   EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxxxx
   ```

---

## 6. Build e deploy

### Build para teste interno (APK)

```bash
npx eas build --platform android --profile preview
```

Gera um APK que pode ser instalado diretamente em dispositivos Android para teste.

### Build para producao (AAB)

```bash
npx eas build --platform android --profile production
```

Gera um AAB (Android App Bundle) otimizado para o Google Play.

### Submit para Google Play

```bash
npx eas submit --platform android --profile production
```

Envia o AAB para a track "internal" no Google Play Console.

### Build + Submit em um comando

```bash
npx eas build --platform android --profile production --auto-submit
```

---

## 7. Tracks de distribuicao

| Track | Descricao | Revisao Google |
|-------|-----------|----------------|
| Internal testing | Ate 100 testers, deploy imediato | Nao |
| Closed testing | Grupos limitados | Sim (primeira vez) |
| Open testing | Qualquer pessoa pode entrar | Sim |
| Production | Publicado na Play Store | Sim |

### Fluxo recomendado:
1. **Internal testing** - testar com a equipa
2. **Closed testing** - testar com beta testers
3. **Production** - publicar para todos

---

## 8. Digital Asset Links (Passkeys)

Para passkeys funcionarem no Android, e necessario configurar o Digital Asset Links:

1. Obter o SHA-256 fingerprint do signing certificate:
   ```bash
   npx eas credentials --platform android
   ```
   Copiar o SHA-256 do upload certificate.

2. No servidor (api.omeubanco.xyz), criar `/.well-known/assetlinks.json`:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.omeubanco.app",
       "sha256_cert_fingerprints": ["SHA256_DO_CERTIFICATE"]
     }
   }]
   ```

3. Verificar que o ficheiro esta acessivel:
   ```bash
   curl https://api.omeubanco.xyz/.well-known/assetlinks.json
   ```

---

## 9. Problemas conhecidos

### Sentry Auth Token

O EAS Build precisa do `SENTRY_AUTH_TOKEN` para upload de source maps.
Esta configurado como EAS secret (nao no codigo):

```bash
# Verificar secrets configurados
npx eas secret:list
```

Se o token expirar, gerar novo em [sentry.io](https://sentry.io) e atualizar:
```bash
npx eas secret:update --name SENTRY_AUTH_TOKEN --value "novo_token"
```

### Package name vs Bundle ID

- **iOS Bundle ID:** `com.omeubanco-app` (hifens permitidos no iOS)
- **Android Package Name:** `com.omeubanco.app` (hifens NAO permitidos no Android)

Sao diferentes mas identificam o mesmo app em cada plataforma.
