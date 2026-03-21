# O Meu Banco - Website (Landing Page)

Landing page do app O Meu Banco, hospedada em Cloudflare Pages.

## Stack

- Next.js 16 (Static Export)
- React 19
- TypeScript
- Tailwind CSS v4

## URLs

| Ambiente | URL |
|----------|-----|
| Producao | https://omeubanco.xyz |
| Cloudflare Pages | https://omeubanco-website.pages.dev |
| Local | http://localhost:3333 |

## Paginas

| Rota | Descricao |
|------|-----------|
| `/` | Landing page principal |
| `/privacidade` | Politica de Privacidade (LGPD/COPPA) |
| `/termos` | Termos de Uso |
| `/suporte` | Pagina de Suporte + FAQ |

## Desenvolvimento Local

```bash
cd website
npm install
npm run dev -- -p 3333
```

## Deploy para Producao

O site e hospedado no **Cloudflare Pages** como export estatico.

### Comando de Deploy

```bash
cd website
npm run build
npx wrangler pages deploy out --project-name omeubanco-website --commit-dirty=true
```

### Pre-requisitos para Deploy

1. **Wrangler autenticado**: Execute `npx wrangler login` se nunca autenticou
2. **Node.js** instalado
3. **Acesso a conta Cloudflare** (arieldj@gmail.com)

## Infraestrutura

### Dominio: omeubanco.xyz

| Servico | Provedor |
|---------|----------|
| Registro | Namecheap |
| DNS | Cloudflare (Free) |
| Hosting | Cloudflare Pages |
| SSL | Cloudflare (automatico) |
| Email Routing | Cloudflare |

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
