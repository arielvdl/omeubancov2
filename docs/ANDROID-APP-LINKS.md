# Android App Links (universal links)

Os convites de família usam `https://omeubanco.xyz/invite/{code}` como deep link. No iOS isso funciona via AASA. No Android exige Digital Asset Links com o SHA-256 do certificado de assinatura do APK.

## Estado atual

`website/public/.well-known/assetlinks.json` tem `sha256_cert_fingerprints: []` vazio. Resultado: ao tocar um link de convite no Android, o sistema abre o navegador em vez do app. O `omeubanco.xyz/invite/{code}` cai no fallback de website e o usuário precisa tocar "Abrir no app" manualmente.

## Como preencher o SHA-256

### Caso 1: builds locais (debug)

```bash
keytool -list -v \
  -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android -keypass android \
  | grep "SHA256:"
```

### Caso 2: build de produção via Google Play (Play App Signing)

A Play Console assina o APK final com a chave de upload + chave de assinatura gerenciada pela Google. Pegue o fingerprint exato em:

`Play Console > Selecionar app > Setup > App integrity > App signing > App signing key certificate > SHA-256 certificate fingerprint`

Esse é o valor que deve entrar no `assetlinks.json`.

### Caso 3: assinatura manual (não usada hoje)

```bash
keytool -list -v \
  -keystore caminho/da/upload-keystore.jks \
  -alias <alias> \
  | grep "SHA256:"
```

## Atualizar assetlinks.json

1. Pegue o SHA-256 conforme acima (formato `AB:CD:EF:...:99` com `:` separando os bytes em hex maiúsculo).
2. Edite `website/public/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.omeubanco.app",
      "sha256_cert_fingerprints": [
        "AB:CD:EF:...:99"
      ]
    }
  }
]
```

3. Rebuild + redeploy do website (Next.js export → Cloud Run):

```bash
cd website
npm run build
gcloud run deploy omeubanco-website \
  --project omeubanco --region us-central1 --source . --allow-unauthenticated
```

4. Validar:

```bash
curl https://omeubanco.xyz/.well-known/assetlinks.json
```

5. Forçar Android a re-verificar o domínio (após reinstalar o app):

```bash
adb shell pm verify-app-links --re-verify com.omeubanco.app
adb shell pm get-app-links com.omeubanco.app
```

Resultado esperado: `Verified` para `omeubanco.xyz`.

## Quando isso entra na produção

Marcar como bloqueante para o primeiro lançamento Android no Google Play. Sem isso, o convite no Android sempre obriga o usuário a passar pelo fallback web — UX inferior ao iOS.

## Por que `autoVerify: true` no `app.json` não basta

O intent filter já está em `app.json`:

```json
"intentFilters": [
  {
    "action": "VIEW",
    "autoVerify": true,
    "data": [{ "scheme": "https", "host": "omeubanco.xyz", "pathPrefix": "/invite" }],
    "category": ["BROWSABLE", "DEFAULT"]
  }
]
```

`autoVerify: true` faz o Android tentar baixar o `assetlinks.json` na instalação. Se o fingerprint não casar (ou estiver vazio como hoje), a verificação falha silenciosamente, o app perde o privilégio de App Link e cai no comportamento legado (browser primeiro).
