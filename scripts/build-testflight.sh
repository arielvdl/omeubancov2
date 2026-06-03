#!/bin/bash
set -euo pipefail

# ============================================================
# Build & Deploy para TestFlight - O Meu Banco
# ============================================================
# Este script garante que NUNCA se envie env vars de desenvolvimento
# para TestFlight/produção. Ele:
#   1. Salva o .env original
#   2. Substitui pelo .env.production
#   3. Valida que não há IPs locais no bundle
#   4. Faz archive + upload
#   5. Restaura o .env original
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IOS_DIR="$PROJECT_ROOT/ios"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_PROD="$PROJECT_ROOT/.env.production"
ENV_BACKUP="$PROJECT_ROOT/.env.dev.backup"
ARCHIVE_PATH="/tmp/OMeuBanco.xcarchive"
EXPORT_PATH="/tmp/OMeuBancoExport"
EXPORT_OPTIONS="/tmp/ExportOptions.plist"
TEAM_ID="8TA8YQY457"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${YELLOW}[CLEANUP] Restaurando .env de desenvolvimento...${NC}"
    if [ -f "$ENV_BACKUP" ]; then
        mv "$ENV_BACKUP" "$ENV_FILE"
        echo -e "${GREEN}[OK] .env restaurado para desenvolvimento${NC}"
    fi
}

# Sempre restaurar .env ao sair (sucesso, erro, ctrl+c)
trap cleanup EXIT

echo "=========================================="
echo " O Meu Banco - Build TestFlight"
echo "=========================================="
echo ""

# --- Step 1: Validar pré-requisitos ---
echo -e "${YELLOW}[1/8] Validando pré-requisitos...${NC}"

if [ ! -f "$ENV_PROD" ]; then
    echo -e "${RED}[ERRO] .env.production não encontrado!${NC}"
    exit 1
fi

# Validar que .env.production tem URL de produção (não IP local)
PROD_API_URL=$(grep "EXPO_PUBLIC_API_URL" "$ENV_PROD" | cut -d= -f2-)
if echo "$PROD_API_URL" | grep -qE "192\.168\.|10\.\d|localhost|127\.0\.0\.1"; then
    echo -e "${RED}[ERRO] .env.production contém URL local: $PROD_API_URL${NC}"
    echo -e "${RED}A URL deve ser de produção (ex: https://api.omeubanco.xyz/api/v1)${NC}"
    exit 1
fi

# Validar que não tem key de teste do RevenueCat
RC_KEY=$(grep "EXPO_PUBLIC_REVENUECAT_API_KEY" "$ENV_PROD" | cut -d= -f2-)
if echo "$RC_KEY" | grep -q "^test_"; then
    echo -e "${RED}[ERRO] .env.production contém key de TESTE do RevenueCat: $RC_KEY${NC}"
    echo -e "${RED}Use a key de produção (appl_...)${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] .env.production validado${NC}"
echo "  API: $PROD_API_URL"
echo "  RevenueCat: ${RC_KEY:0:10}..."

# --- Step 2: Trocar .env para produção ---
echo ""
echo -e "${YELLOW}[2/8] Trocando .env para produção...${NC}"

cp "$ENV_FILE" "$ENV_BACKUP"
cp "$ENV_PROD" "$ENV_FILE"

# Manter o Sentry DSN do app (pode ser diferente do backend)
SENTRY_DSN=$(grep "EXPO_PUBLIC_SENTRY_DSN" "$ENV_PROD" | cut -d= -f2-)
if [ -z "$SENTRY_DSN" ]; then
    # Se não tiver no .env.production, pegar do backup
    SENTRY_DSN=$(grep "EXPO_PUBLIC_SENTRY_DSN" "$ENV_BACKUP" | cut -d= -f2-)
    if [ -n "$SENTRY_DSN" ]; then
        echo "EXPO_PUBLIC_SENTRY_DSN=$SENTRY_DSN" >> "$ENV_FILE"
    fi
fi

echo -e "${GREEN}[OK] .env agora usa valores de produção${NC}"

# --- Step 3: Prebuild ---
echo ""
echo -e "${YELLOW}[3/8] Gerando projeto nativo iOS (prebuild)...${NC}"

cd "$PROJECT_ROOT"
npx expo prebuild --clean --platform ios 2>&1 | tail -3

echo -e "${GREEN}[OK] Prebuild concluído${NC}"

# --- Forçar aps-environment=production (CRÍTICO para push) ---
# 'expo prebuild --clean' regenera o entitlements com aps-environment=development.
# Builds de distribuição (TestFlight/App Store) entregam pelo gateway APNs de
# PRODUÇÃO; com 'development' o token fica no sandbox e a Apple descarta TODOS os
# pushes silenciosamente. Reescrevemos AQUI (após o prebuild, antes do archive),
# pois é o único momento em que o arquivo existe com o valor errado.
ENTITLEMENTS="$IOS_DIR/OMeuBanco/OMeuBanco.entitlements"
if [ -f "$ENTITLEMENTS" ]; then
    if /usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS" >/dev/null 2>&1; then
        /usr/libexec/PlistBuddy -c "Set :aps-environment production" "$ENTITLEMENTS"
    else
        /usr/libexec/PlistBuddy -c "Add :aps-environment string production" "$ENTITLEMENTS"
    fi
    APS_ENV=$(/usr/libexec/PlistBuddy -c "Print :aps-environment" "$ENTITLEMENTS")
    if [ "$APS_ENV" != "production" ]; then
        echo -e "${RED}[ERRO] Falha ao definir aps-environment=production (valor: $APS_ENV)${NC}"
        exit 1
    fi
    echo -e "${GREEN}[OK] aps-environment forçado para 'production' (push em produção)${NC}"
else
    echo -e "${RED}[ERRO] Entitlements não encontrado: $ENTITLEMENTS${NC}"
    exit 1
fi

# NOTA: NÃO remover NSMicrophoneUsageDescription — expo-audio precisa da chave
# no Info.plist mesmo que microphonePermission=false no app.json.
# A remoção causava crash silencioso na inicialização do áudio (build 25).

# --- Step 4: Incrementar build number ---
echo ""
echo -e "${YELLOW}[4/8] Incrementando build number...${NC}"

INFO_PLIST="$IOS_DIR/OMeuBanco/Info.plist"
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST")

# Buscar o último build number do histórico no TESTFLIGHT.md
LAST_BUILD=$(grep -oE '\(([0-9]+)\)' "$PROJECT_ROOT/docs/TESTFLIGHT.md" | grep -oE '[0-9]+' | sort -n | tail -1)

# Usar o maior entre o atual e o do histórico
if [ -n "$LAST_BUILD" ] && [ "$LAST_BUILD" -gt "$CURRENT_BUILD" ]; then
    NEXT_BUILD=$((LAST_BUILD + 1))
else
    NEXT_BUILD=$((CURRENT_BUILD + 1))
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT_BUILD" "$INFO_PLIST"
echo -e "${GREEN}[OK] Build number: $CURRENT_BUILD -> $NEXT_BUILD${NC}"

# --- Step 5: Limpar DerivedData e Archive ---
echo ""
echo -e "${YELLOW}[5/8] Gerando archive (isso leva alguns minutos)...${NC}"

rm -rf ~/Library/Developer/Xcode/DerivedData/OMeuBanco-*

cd "$IOS_DIR"
SENTRY_ALLOW_FAILURE=true xcodebuild archive \
    -workspace OMeuBanco.xcworkspace \
    -scheme OMeuBanco \
    -configuration Release \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    DEVELOPMENT_TEAM="$TEAM_ID" \
    CODE_SIGN_STYLE=Automatic \
    -allowProvisioningUpdates \
    2>&1 > /tmp/xcodebuild_full.log

if ! grep -q "ARCHIVE SUCCEEDED" /tmp/xcodebuild_full.log; then
    echo -e "${RED}[ERRO] Archive falhou! Verifique /tmp/xcodebuild_full.log${NC}"
    grep -E "error:" /tmp/xcodebuild_full.log | grep -v "URLSession\|didComplete\|sentry-cli\|Sentry Logger\|accessing build" | tail -10
    exit 1
fi

echo -e "${GREEN}[OK] Archive concluído${NC}"

# --- Step 6: Validar bundle (CRÍTICO) ---
echo ""
echo -e "${YELLOW}[6/8] Validando bundle (verificando URLs)...${NC}"

BUNDLE_PATH="$ARCHIVE_PATH/Products/Applications/OMeuBanco.app/main.jsbundle"

if strings "$BUNDLE_PATH" 2>/dev/null | grep -qE "http://192\.168\.|http://10\.|http://localhost:[0-9]+/api|http://127\.0\.0\.1"; then
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}[ERRO CRÍTICO] Bundle contém URL local!${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    strings "$BUNDLE_PATH" | grep -oE "http://(192\.168|10\.|localhost|127\.0\.0\.1)[^\"' ]*" | head -5
    echo ""
    echo -e "${RED}O build NÃO foi enviado. Corrija o .env.production e tente novamente.${NC}"
    exit 1
fi

if strings "$BUNDLE_PATH" 2>/dev/null | grep -qE "REVENUECAT.*test_mc|test_mck"; then
    echo -e "${RED}[ERRO CRÍTICO] Bundle contém key de TESTE do RevenueCat!${NC}"
    exit 1
fi

# Confirmar que a URL de produção está presente (grep -c binário para lidar com minificação)
if ! grep -cq "api.omeubanco.xyz" "$BUNDLE_PATH" 2>/dev/null; then
    echo -e "${RED}[ERRO] URL de produção (api.omeubanco.xyz) NÃO encontrada no bundle!${NC}"
    exit 1
fi

echo -e "${GREEN}[OK] Bundle validado - usando URL de produção${NC}"

# --- Step 7: Export e Upload ---
echo ""
echo -e "${YELLOW}[7/8] Exportando e enviando para App Store Connect...${NC}"

cat > "$EXPORT_OPTIONS" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>8TA8YQY457</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>uploadSymbols</key>
    <false/>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
PLIST

rm -rf "$EXPORT_PATH"
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -exportPath "$EXPORT_PATH" \
    -allowProvisioningUpdates \
    2>&1 | tail -5

if ! xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -exportPath "$EXPORT_PATH" \
    -allowProvisioningUpdates 2>&1 | grep -q "EXPORT SUCCEEDED"; then
    # Check if already uploaded (the first call above already did it)
    if [ -f "$EXPORT_PATH/OMeuBanco.ipa" ] || [ -f "$EXPORT_PATH/DistributionSummary.plist" ]; then
        echo -e "${GREEN}[OK] Upload concluído${NC}"
    fi
fi

echo -e "${GREEN}[OK] Build enviado para App Store Connect${NC}"

# --- Step 8: Resumo ---
echo ""
echo "=========================================="
echo -e "${GREEN} BUILD CONCLUÍDO COM SUCESSO${NC}"
echo "=========================================="
echo ""
echo "  Versão:     1.0.0 ($NEXT_BUILD)"
echo "  API URL:    $PROD_API_URL"
echo "  RevenueCat: ${RC_KEY:0:10}... (produção)"
echo "  TestFlight: disponível em ~5-15 minutos"
echo ""
echo "  .env restaurado para desenvolvimento."
echo ""
