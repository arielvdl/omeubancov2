# Deploy para TestFlight - O Meu Banco

Guia completo para gerar builds e distribuir o app via TestFlight.

**Stack:** Expo SDK 54 + React Native 0.81
**Bundle ID:** `com.queroomeubanco.app`
**Apple Team ID:** `ND8DU74P4S`
**Organizacao:** Paleta Fosforescente, LDA
**App Store Connect App ID:** `6760633223`
**Metodo de build:** `xcodebuild` direto (sem EAS Build)

---

## REGRA CRITICA - NAO USAR EAS BUILD

**NUNCA use `eas build` para este projeto.** O build e feito localmente via `xcodebuild`.

O EAS Build requer login interativo (`eas login`) que nao funciona em ambientes automatizados/CLI.
Se um agente ou script tentar usar `eas build`, vai falhar com erro de autenticacao.

**Errado:**
```bash
# NAO FAZER - vai falhar pedindo login
eas build --platform ios
eas build --platform ios --profile preview
eas build --platform ios --profile production
```

**Correto:**
```bash
# Usar xcodebuild diretamente - funciona sem login externo
xcodebuild archive -workspace OMeuBanco.xcworkspace ...
xcodebuild -exportArchive ...
```

O `eas-cli` esta instalado apenas como referencia. Todo o processo de build e upload
usa `xcodebuild` + `ExportOptions.plist` que acessa os certificados Apple diretamente
do Keychain do macOS, sem precisar de login em servicos externos.

---

## Indice

1. [Pre-requisitos](#1-pre-requisitos)
2. [Gerar o projeto nativo iOS](#2-gerar-o-projeto-nativo-ios)
3. [Incrementar o numero do build](#3-incrementar-o-numero-do-build)
4. [Gerar o archive](#4-gerar-o-archive)
5. [Criar o ExportOptions.plist](#5-criar-o-exportoptionsplist)
6. [Exportar e enviar para App Store Connect](#6-exportar-e-enviar-para-app-store-connect)
7. [Configurar no App Store Connect](#7-configurar-no-app-store-connect)
8. [Distribuir para testers](#8-distribuir-para-testers)
9. [Problemas conhecidos e solucoes](#9-problemas-conhecidos-e-solucoes)

---

## Configuracao de Ambiente

O app usa o sistema de env vars do Expo SDK 54 (`@expo/env`):

| Ficheiro | Quando e usado | Commitar? |
|----------|---------------|-----------|
| `.env` | Desenvolvimento (`npx expo start`, Expo Go) | Nao (gitignored) |
| `.env.production` | Builds Release (`xcodebuild -configuration Release`) | Sim (valores publicos) |
| `.env.production.local` | Override local de producao | Nao (gitignored) |

Em builds Release, o Metro define `NODE_ENV=production`, e `.env.production` tem prioridade sobre `.env`.

**Verificacao antes do build:**
```bash
# Confirmar que .env.production existe e tem a URL correta
cat .env.production | grep API_URL
# Esperado: EXPO_PUBLIC_API_URL=https://omeubanco-api-...run.app/api/v1
```

> **IMPORTANTE:** O EAS Build NAO e usado neste projeto, entao os env vars do `eas.json` nunca sao aplicados. Toda a configuracao de ambiente vem dos ficheiros `.env*`.

---

## 1. Pre-requisitos

Antes de iniciar, confirme que tem tudo configurado:

- [ ] macOS com Xcode instalado e atualizado
- [ ] Conta de desenvolvedor Apple ativa (Apple Developer Program - 99 EUR/ano)
- [ ] Contrato de licenca (PLA) aceito no App Store Connect pelo Account Holder (ariel@ecommerceexperience.co)
- [ ] Certificado de distribuicao configurado no Xcode (Automatic Signing resolve isto)
- [ ] CocoaPods instalado (vem com o Xcode, ou `gem install cocoapods`)
- [ ] Icone do app SEM canal alpha/transparencia (verificar com `sips -g hasAlpha assets/images/icon.png`)
- [ ] **NAO precisa de EAS login, Expo login, ou qualquer login externo** - tudo usa Keychain local

---

## 2. Gerar o projeto nativo iOS

O Expo precisa gerar (ou regenerar) o projeto nativo iOS antes do build. Executar na raiz do projeto:

```bash
npx expo prebuild --clean --platform ios
```

Isto gera a pasta `ios/` com o workspace `OMeuBanco.xcworkspace`, o `Podfile`, e toda a configuracao nativa baseada no `app.json`.

**Quando executar este passo:**
- Primeira vez configurando o projeto
- Apos alterar plugins no `app.json`
- Apos adicionar/remover dependencias nativas
- Quando o build falha por inconsistencias no projeto nativo

**Atencao:** O flag `--clean` apaga a pasta `ios/` e recria do zero. Qualquer alteracao manual feita diretamente em ficheiros nativos sera perdida.

---

## 3. Incrementar o numero do build

Cada upload para o App Store Connect exige um `CFBundleVersion` unico. O valor deve ser um inteiro incremental (1, 2, 3...).

**Verificar o valor atual:**

```bash
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/OMeuBanco/Info.plist
```

**Definir o novo valor** (substituir `N` pelo proximo numero):

```bash
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion N" ios/OMeuBanco/Info.plist
```

**Exemplo** (se o valor atual e 3, definir como 4):

```bash
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 4" ios/OMeuBanco/Info.plist
```

Se esquecer de incrementar, o upload sera rejeitado com erro de versao duplicada.

---

## 4. Gerar o archive

Executar o archive via `xcodebuild` a partir da pasta `ios/`:

```bash
cd ios && xcodebuild archive \
  -workspace OMeuBanco.xcworkspace \
  -scheme OMeuBanco \
  -configuration Release \
  -archivePath /tmp/OMeuBanco.xcarchive \
  -destination "generic/platform=iOS" \
  DEVELOPMENT_TEAM=ND8DU74P4S \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates
```

**O que cada parametro faz:**

| Parametro | Descricao |
|-----------|-----------|
| `-workspace` | O workspace do Xcode gerado pelo Expo |
| `-scheme` | O scheme principal do app |
| `-configuration Release` | Build otimizado para producao |
| `-archivePath` | Onde salvar o archive (usa `/tmp` para nao poluir o projeto) |
| `-destination` | Target generico iOS (nao um simulador especifico) |
| `DEVELOPMENT_TEAM` | O Apple Team ID da organizacao |
| `CODE_SIGN_STYLE=Automatic` | Deixa o Xcode resolver certificados e provisioning profiles |
| `-allowProvisioningUpdates` | Permite download automatico de provisioning profiles |

Este passo demora alguns minutos. Ao final, o archive estara em `/tmp/OMeuBanco.xcarchive`.

---

## 5. Criar o ExportOptions.plist

Criar o ficheiro de configuracao de exportacao em `/tmp/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>ND8DU74P4S</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
```

Pode criar o ficheiro com qualquer editor, ou via terminal:

```bash
cat > /tmp/ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>ND8DU74P4S</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
EOF
```

**Nota:** O `destination` como `upload` faz o `xcodebuild` enviar o build diretamente para o App Store Connect, sem gerar um `.ipa` local.

---

## 6. Exportar e enviar para App Store Connect

Com o archive e o `ExportOptions.plist` prontos, exportar e fazer upload:

```bash
xcodebuild -exportArchive \
  -archivePath /tmp/OMeuBanco.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/OMeuBancoExport \
  -allowProvisioningUpdates
```

Se o upload for bem-sucedido, a saida incluira `Export Succeeded`. O build aparecera no App Store Connect dentro de alguns minutos (geralmente 5-15 minutos para processar).

---

## 7. Configurar no App Store Connect

Apos o upload, aceder a [App Store Connect](https://appstoreconnect.apple.com):

1. Ir a **Apps** > **O Meu Banco** > **TestFlight**
2. Aguardar o processamento do build (status "Processing")
3. Quando o build aparecer, resolver o **Export Compliance**:
   - Clicar em "Manage" no aviso de Export Compliance
   - Selecionar **"None of the algorithms mentioned above"** (o app nao usa encriptacao proprietaria)
   - Confirmar
4. O build fica disponivel para distribuicao

**Importante:** Sem resolver o Export Compliance, o build nao pode ser distribuido para nenhum tester.

---

## 8. Distribuir para testers

### Grupos configurados

| Grupo | Tipo | Email | Observacoes |
|-------|------|-------|-------------|
| Beta Testers | Interno | arieldj@gmail.com | Recebe builds imediatamente |
| External Testers | Externo | vanessapeq@gmail.com | Requer aprovacao da Apple |

### Testers internos

Testers internos sao membros da equipa no App Store Connect. Recebem acesso ao build imediatamente apos o processamento e a resolucao do Export Compliance.

Para adicionar novos testers internos:
1. App Store Connect > **TestFlight** > **Internal Testing** > grupo "Beta Testers"
2. Clicar em **"+"** e adicionar o email (deve ser um utilizador do App Store Connect)
3. O tester recebe um convite por email para instalar o TestFlight

### Testers externos

Testers externos sao pessoas fora da organizacao. O primeiro build enviado para um grupo externo requer **Beta App Review** pela Apple.

- Tempo de revisao: geralmente 24-48 horas na primeira vez
- Builds subsequentes para o mesmo grupo podem nao precisar de nova revisao
- A Apple pode rejeitar se houver crashes evidentes ou conteudo inapropriado

Para adicionar novos testers externos:
1. App Store Connect > **TestFlight** > **External Testing** > grupo "External Testers"
2. Clicar em **"+"** e adicionar o email
3. Selecionar o build a distribuir
4. Preencher as notas de teste ("What to Test")
5. Submeter para revisao

---

## 9. Problemas conhecidos e solucoes

### Icone do app nao aparece (mostra icone generico)

**Causa:** O ficheiro de icone tem canal alpha (transparencia). O iOS rejeita silenciosamente icones com transparencia.

**Solucao:** Remover o canal alpha do icone antes do prebuild:

```bash
# Verificar se tem alpha
sips -g hasAlpha assets/images/icon.png

# Remover alpha (se necessario)
sips -s format png --setProperty hasAlpha false assets/images/icon.png
```

Apos corrigir, executar `npx expo prebuild --clean --platform ios` novamente.

### Erro "License Agreement has been updated"

**Causa:** O contrato de licenca (PLA) do Apple Developer Program foi atualizado e precisa ser aceito.

**Solucao:** O **Account Holder** da organizacao deve:
1. Aceder a [developer.apple.com](https://developer.apple.com)
2. Aceitar o novo contrato de licenca
3. Tentar o upload novamente

Apenas o Account Holder pode aceitar o PLA. Outros membros da equipa nao tem permissao.

### Erro de versao duplicada no upload

**Causa:** O `CFBundleVersion` nao foi incrementado desde o ultimo upload.

**Solucao:** Incrementar o build number conforme a [secao 3](#3-incrementar-o-numero-do-build) e repetir o processo de archive e upload.

### Build nao aparece no TestFlight

**Causa possivel:** O build ainda esta a ser processado, ou houve um erro no processamento.

**Solucao:**
1. Aguardar 15-30 minutos
2. Verificar o email do Account Holder para notificacoes de erro
3. Verificar a secao **Activity** no App Store Connect para ver o estado do processamento

### App mostra onboarding mesmo com conta criada

**Causa:** O `.env` contem um IP local (ex: `http://192.168.1.118:3000/api/v1`). Como o build usa `xcodebuild` (nao EAS Build), os env vars do `eas.json` nunca sao aplicados. Resultado: todas as chamadas de API no TestFlight apontam para um IP inacessivel e falham silenciosamente.

**Solucao:**
1. Verificar que `.env.production` existe na raiz do projeto com a URL de producao
2. Fazer `npx expo prebuild --clean --platform ios` para regenerar o projeto nativo
3. Rebuild e upload

**Verificacao nos logs (Xcode > Devices):**
Procurar por `[INFO] [App] API URL:` — deve mostrar a URL de producao, nao um IP local.

### Erro de provisioning profile

**Causa:** O Xcode nao conseguiu criar/descarregar o provisioning profile automaticamente.

**Solucao:**
1. Abrir o projeto no Xcode: `open ios/OMeuBanco.xcworkspace`
2. Ir a **Signing & Capabilities**
3. Confirmar que "Automatically manage signing" esta ativo
4. Verificar que o Team correto esta selecionado (Paleta Fosforescente, LDA)
5. Fechar o Xcode e tentar o `xcodebuild` novamente

---

## Resumo rapido (checklist para Claude Code / agentes AI)

**IMPORTANTE para agentes AI:** NAO usar `eas build`, `eas submit`, ou qualquer comando EAS.
Usar APENAS `xcodebuild` conforme abaixo. NAO pedir login do Expo/EAS ao usuario.

Para deploy rapido, executar na raiz do projeto:

```bash
# 1. Regenerar projeto nativo
cd /Users/arielsilva/Documents/PROJETOS/omeubanco-v2
npx expo prebuild --clean --platform ios

# 2. Verificar build number atual e incrementar
CURRENT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/OMeuBanco/Info.plist)
NEXT=$((CURRENT + 1))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT" ios/OMeuBanco/Info.plist
echo "Build: $CURRENT -> $NEXT"

# 3. Archive
cd ios && xcodebuild archive \
  -workspace OMeuBanco.xcworkspace \
  -scheme OMeuBanco \
  -configuration Release \
  -archivePath /tmp/OMeuBanco.xcarchive \
  -destination "generic/platform=iOS" \
  DEVELOPMENT_TEAM=ND8DU74P4S \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates

# 4. Criar ExportOptions.plist (se nao existir em /tmp)
cat > /tmp/ExportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>ND8DU74P4S</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <true/>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
PLIST

# 5. Exportar e upload direto pro App Store Connect
rm -rf /tmp/OMeuBancoExport
xcodebuild -exportArchive \
  -archivePath /tmp/OMeuBanco.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/OMeuBancoExport \
  -allowProvisioningUpdates

# 6. Aguardar ~5-15min para processar no App Store Connect
# Os testers internos (Beta Testers) recebem automaticamente
# O Export Compliance so precisa ser resolvido na primeira vez
```

## Historico de builds

| Build | Data | Notas |
|-------|------|-------|
| 1.0.0 (1) | 2026-03-16 02:49 | Primeiro build, icone com alpha (nao aparecia) |
| 1.0.0 (2) | 2026-03-16 03:05 | Icone corrigido (alpha removido) |
| 1.0.0 (3) | 2026-03-16 03:30 | Atualizacoes diversas |
| 1.0.0 (4) | 2026-03-16 14:48 | Fix: splash border, passkey RP_ID, Google OAuth error handling |
| 1.0.0 (5) | 2026-03-16 | Fix: .env.production para API URL, hydration resilience, logger |
| 1.0.0 (6) | 2026-03-17 | Passkey: debug logging, base64url normalization, error handling, privacy policy, stats |
| 1.0.0 (7) | 2026-03-17 | Gráfico comparativo extrato, fix chart overflow, comprovante no saque (categoria + foto) |
| 1.0.0 (8) | 2026-03-17 | Comprovante aparece no drawer de detalhes, data de nascimento editável no perfil, drawer no extrato do pai |
| 1.0.0 (9) | 2026-03-17 | Fix: DatePicker em modal iOS, upload receipt com FormData correto, GCS makePublic |
