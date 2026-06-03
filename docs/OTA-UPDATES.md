# Atualizações OTA (EAS Update) — O Meu Banco

Permite entregar correções **somente-JS / assets** aos usuários de produção **sem
passar por review da App Store / Google Play**. Complementa — não substitui — o
fluxo nativo de `docs/TESTFLIGHT.md`.

## ⚠️ Regra de ouro: OTA vs build nativo

| Tipo de mudança | Como entregar |
|-----------------|---------------|
| JS / TSX, estilos, textos, lógica de tela, i18n, imagens em `assets/` | `eas update` (OTA) |
| Módulo nativo novo/atualizado (ex.: bump do NetInfo), novo plugin em `app.json`, nova permissão, bump de SDK, mudança de `runtimeVersion` | **Build nativo** (`./scripts/build-testflight.sh`) + submissão na loja |

OTA **nunca** cobre código nativo. O `runtimeVersion` (política `appVersion`) garante
que um update OTA só pousa em binários com a **mesma versão nativa** — então um update
publicado para `1.0.3` jamais quebra um device que já está em `1.0.4`.

## Configuração (já feita no repo)

- `package.json` → `expo-updates: ~29.0.18` (versão do SDK 54).
- `app.json` → `runtimeVersion.policy = "appVersion"` + `updates.url` (CDN do Expo,
  projectId `36e73d9b-…`) + `requestHeaders.expo-channel-name = "production"`.
  O header **fixa o canal** no binário — necessário porque os builds iOS de produção
  são feitos via `xcodebuild` (não `eas build`).
- `eas.json` → `channel` por profile (`development` / `preview` / `production`).

## Ativação (uma vez — exige 1 build nativo)

O OTA só passa a funcionar depois que existir **um binário em produção que já contenha
o runtime `expo-updates`**. Builds atuais na loja NÃO têm o módulo, então o primeiro
update tem que ir junto de um build nativo:

```bash
# 1. Instalar o módulo nativo localmente (trava a versão exata p/ o SDK)
npx expo install expo-updates

# 2. Logar na conta Expo dona do projeto (owner: arieldj)
eas login

# 3. Criar o canal de produção e linkar a um branch de update
eas channel:create production   # (ou confirmar que já existe)

# 4. Build nativo COM o runtime de updates embutido + subir p/ TestFlight
./scripts/build-testflight.sh
#    -> distribuir esse build na App Store / TestFlight normalmente
```

A partir daí, todo device em produção roda um binário OTA-capaz.

## Publicar um update JS (rotina)

```bash
# Publica o JS atual no canal de produção
eas update --branch production --message "fix: tela inicial cold-boot"
```

Os apps buscam o update em background no próximo cold start (`fallbackToCacheTimeout: 0`
= usa o bundle embutido na hora e troca na abertura seguinte).

> Exemplo real: o fix do **bug da tela vazia no cold-boot** (`app/(tabs)/index.tsx`) é
> 100% JS — depois que o OTA estiver ativo, correções desse tipo chegam por
> `eas update`, sem novo review.

## Checklist de verificação pós-ativação

1. `npx expo config --type public` mostra `updates.url` e `runtimeVersion`.
2. No device, após instalar o build OTA-capaz: publicar um `eas update` e confirmar
   que a mudança aparece no 2º cold start.
3. `eas update:list --branch production` lista o update publicado.

## Pendências de plataforma (fora do código)

- **Android está defasado** (`android/app/build.gradle`: `versionCode 1 / 1.0.0` vs iOS
  `1.0.3(35)`). Antes de confiar em OTA no Android, subir um build atual via Google Play
  (`docs/GOOGLE-PLAY.md`) — OTA não conserta um binário nativo velho.
- Confirmar no dashboard do Expo que o projeto `36e73d9b-…` tem credenciais APNs/FCM
  válidas (necessárias para push, independentes do OTA).
