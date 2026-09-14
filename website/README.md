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
| `/conceitos` | Laboratório visual interno com três alternativas de landing |
| `/quem-somos` | História do produto e seus criadores |
| `/marca` | Prévia e downloads da marca em SVG e PNG, imagens editoriais em JPG e pacotes ZIP |
| `/privacidade` | Politica de Privacidade (LGPD/COPPA) |
| `/termos` | Termos de Uso |
| `/suporte` | Pagina de Suporte + FAQ |
| `/docs/api` | Documentacao humana da API publica |

## Laboratório de Landing Page

**Meta em Movimento** foi escolhida como a landing principal em `/`. A rota
`/conceitos` permanece como um laboratório histórico, com `noindex, nofollow`,
para comparar as três direções criadas durante a exploração:

1. **Família Primeiro** — acolhedora, madura e orientada à confiança.
2. **Meta em Movimento** — expressiva, visual e centrada em conquistas.
3. **Duas Visões** — demonstra as experiências da criança e do responsável.

O comparador reutiliza conteúdo, CTAs e molduras de produto compartilhados em
`src/components/landing-concepts/`. A rota aponta o canonical para `/` e
permanece fora do sitemap e dos artefatos públicos em Markdown.

## Arquivos da Marca

A página `/marca` reutiliza o header e o footer do site. Os downloads estáticos em
`public/brand/` são cópias fiéis de `../assets/logos/icon-o-meu-banco.svg` e dos
PNGs de 192, 512 e 1024 pixels dessa mesma pasta. O SVG contém formas vetoriais,
sem fontes ou imagens externas. `o-meu-banco-marca.zip` reúne somente esses quatro arquivos.
Ao atualizar a marca, mantenha essas cópias e o ZIP sincronizados com os originais;
os tamanhos apresentados na página são calculados no build.

### Imagens para matérias

A mesma página oferece quatro imagens ilustrativas sobre educação financeira
infantil, com títulos editoriais sugeridos e descrições breves. Esses textos são
exibidos na página e na versão Markdown; não são sobrepostos aos arquivos de imagem.
As cenas não representam funcionalidades bancárias do produto: O Meu Banco é um
simulador educacional, sem transações reais.

| Download | Formato e dimensões | Origem |
|----------|--------------------|--------|
| [Jornada em família — horizontal](public/brand/imagens/jornada-em-familia-horizontal.jpg) | JPG · 1774 × 887 px | Conversão do [asset aprovado da homepage](public/images/jornada-em-familia.webp), preservando dimensões e composição, sem novos textos ou recortes |
| [Planejamento em família](public/brand/imagens/planejamento-em-familia.jpg) | JPG · 1200 × 1200 px | [JPG original fornecido via CDN](https://cdn.naia.today/naia-logos/content-covers/172b2445-c95a-4570-9060-83d7546eed15/dd6c0415-dff6-4959-a946-9da5b09f0ff9/1x1-c03bb3bbed683f76.jpg) |
| [Escolhas e recompensas](public/brand/imagens/escolhas-e-recompensas.jpg) | JPG · 1200 × 1200 px | [JPG original fornecido via CDN](https://cdn.naia.today/naia-logos/content-covers/172b2445-c95a-4570-9060-83d7546eed15/48a22194-0ea7-4a0f-8938-7b57295a192c/1x1-3d489cb61697ed62.jpg) |
| [Dinheiro e consumo](public/brand/imagens/dinheiro-e-consumo.jpg) | JPG · 1200 × 1200 px | [JPG original fornecido via CDN](https://cdn.naia.today/naia-logos/content-covers/172b2445-c95a-4570-9060-83d7546eed15/14b64d97-f8ae-4bb1-841f-146f1b0689cb/1x1-9072ab04a3b8178a.jpg) |

Os três JPGs quadrados são cópias dos arquivos originais fornecidos. O pacote
[o-meu-banco-imagens.zip](public/brand/o-meu-banco-imagens.zip) contém somente os
quatro JPGs, idênticos aos downloads individuais. Mantenha os títulos e descrições
de `src/app/marca/page.tsx` e `public/__markdown/marca.md` alinhados e atualize o
ZIP quando houver mudança nos arquivos. A página não estabelece licença de uso.

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
│   │   ├── conceitos/     # Laboratório visual noindex
│   │   ├── quem-somos/
│   │   ├── privacidade/
│   │   ├── termos/
│   │   └── suporte/
│   └── components/
│       ├── landing-concepts/ # Comparador, variantes e primitivas compartilhadas
│       ├── Header.tsx
│       └── Footer.tsx
├── next.config.ts         # output: "export"
└── package.json
```
