# Documentação da API

## Base da API

- Produção: `https://api.omeubanco.xyz`
- Health check: `https://api.omeubanco.xyz/health`

## Descoberta para agentes

- API catalog: `https://omeubanco.xyz/.well-known/api-catalog`
- OpenAPI: `https://omeubanco.xyz/docs/api/openapi.json`
- Protected resource metadata: `https://api.omeubanco.xyz/.well-known/oauth-protected-resource`
- Agent skills index: `https://omeubanco.xyz/.well-known/agent-skills/index.json`

## Grupos principais

- `/api/v1/auth/*`: autenticação de pais, responsáveis, crianças, Google OAuth e Passkeys
- `/api/v1/families/*`: dados da família
- `/api/v1/children/*`: filhos, transações, analytics, contratos, wishlist e agendamentos
- `/api/v1/invitations/*`: convites
- `/api/v1/upload/*`: uploads
- `/api/v1/subscription/*`: assinatura e limites

## Autenticação

Os endpoints protegidos usam `Authorization: Bearer <token>`.

No estado atual do projeto, o backend publica metadata do protected resource, mas ainda não anuncia um authorization server OAuth/OIDC público completo.
