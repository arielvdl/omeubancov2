# O Meu Banco - Website (Landing Page)

Landing page do app O Meu Banco, hospedada no Google Cloud Run.

## Stack

- Next.js 16 (Static Export)
- React 19
- TypeScript
- Tailwind CSS v4
- Nginx em container Cloud Run

## URLs

| Ambiente | URL |
|----------|-----|
| Producao | https://omeubanco.xyz |
| Cloud Run | https://omeubanco-website-konhqbq7qq-uc.a.run.app |
| Local | http://localhost:3333 |

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Landing page principal |
| `/privacidade` | Politica de Privacidade (LGPD/COPPA) |
| `/termos` | Termos de Uso |
| `/suporte` | Pagina de Suporte + FAQ |
| `/docs/api` | Documentacao humana da API publica |

## Descoberta Para Agentes

O website publica artefatos de descoberta para agentes e integradores:

- `/.well-known/api-catalog` - API catalog em `application/linkset+json`
- `/.well-known/agent-skills/index.json` - indice de skills publicas
- `/.well-known/mcp/server-card.json` - card do servidor MCP/WebMCP
- `/docs/api/openapi.json` - descricao OpenAPI da API publica
- `nginx.conf` - headers `Link`, content types e negociacao `Accept: text/markdown`

### Teste Local da Negociacao Markdown

Depois do build estatico, suba o container localmente:

```bash
cd website
docker build -t omeubanco-website .
docker run --rm -p 8080:8080 omeubanco-website
```

Exemplo de verificacao:

```bash
curl http://127.0.0.1:8080/ -H "Accept: text/markdown"
curl -I http://127.0.0.1:8080/
```

## Desenvolvimento Local

```bash
cd website
npm install
npm run dev -- -p 3333
```

## Deploy para Producao

O site e hospedado no **Google Cloud Run** como export estatico servido por Nginx.

### Comando de Deploy

```bash
cd website
npm run build
gcloud run deploy omeubanco-website \
  --project omeubanco \
  --region us-central1 \
  --source . \
  --allow-unauthenticated
```

### Pre-requisitos para Deploy

1. **gcloud autenticado**: `gcloud auth login`
2. **Projeto correto**: `gcloud config set project omeubanco`
3. **Permissao Cloud Run/Cloud Build** na conta Google (`invoicegotas@gmail.com`)
4. **Node.js** instalado para gerar `out/` antes do deploy

## Infraestrutura

### Dominio: omeubanco.xyz

| Servico | Provedor |
|---------|----------|
| Registro | Namecheap |
| DNS | Google Cloud / provedor DNS do dominio |
| Hosting | Google Cloud Run |
| Build | Google Cloud Build via `gcloud run deploy --source` |
| SSL | Gerenciado no dominio customizado |
| Email Routing | Configuracao externa do dominio |

### Nameservers (Cloudflare)

- `brad.ns.cloudflare.com`
- `leah.ns.cloudflare.com`

### Email Routing

| De | Para | Status |
|----|------|--------|
| suporte@omeubanco.xyz | arieldj@gmail.com | Ativa |

## Estrutura do Projeto

```
website/
├── Dockerfile             # Imagem Nginx usada no Cloud Run
├── nginx.conf             # Clean URLs, headers Link, Markdown e cache
├── .gcloudignore          # Arquivos enviados ao Cloud Build
├── public/
│   └── icon.png
├── src/
│   ├── app/
│   │   ├── layout.tsx     # Layout com SEO/OG metadata
│   │   ├── page.tsx       # Landing page
│   │   ├── privacidade/
│   │   ├── termos/
│   │   └── suporte/
│   └── components/
│       ├── Header.tsx
│       └── Footer.tsx
├── next.config.ts         # output: "export"
└── package.json
```
