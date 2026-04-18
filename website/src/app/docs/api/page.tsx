import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentação da API",
  description:
    "Visão geral da API pública do O Meu Banco, incluindo catálogo, OpenAPI e endpoints de descoberta para agentes.",
};

const endpointGroups = [
  {
    path: "/health",
    description: "Health check público do backend.",
  },
  {
    path: "/api/v1/auth/*",
    description:
      "Autenticação da família, login infantil, Google OAuth e Passkeys.",
  },
  {
    path: "/api/v1/families/*",
    description: "Dados da família e preferências principais.",
  },
  {
    path: "/api/v1/children/*",
    description:
      "Cadastro de filhos, extrato, analytics, contratos, wishlist e agendamentos.",
  },
  {
    path: "/api/v1/invitations/*",
    description: "Convites de responsáveis e aceite de convites.",
  },
  {
    path: "/api/v1/upload/*",
    description: "Uploads de avatar, comprovantes e imagens da wishlist.",
  },
  {
    path: "/api/v1/subscription/*",
    description: "Estado da assinatura e limites do plano.",
  },
];

const discoveryEndpoints = [
  {
    path: "/.well-known/api-catalog",
    description:
      "Catálogo machine-readable com ponteiros para a OpenAPI, documentação humana e health check.",
  },
  {
    path: "/docs/api/openapi.json",
    description:
      "Descrição OpenAPI pública da API, útil para integração automatizada.",
  },
  {
    path: "https://api.omeubanco.xyz/.well-known/oauth-protected-resource",
    description:
      "Metadados do recurso protegido publicados pelo host da API para clientes OAuth-aware.",
  },
  {
    path: "/.well-known/agent-skills/index.json",
    description:
      "Índice de skills públicas para agentes que interagem com o site institucional.",
  },
];

export default function ApiDocsPage() {
  return (
    <div className="bg-white py-16 sm:py-24">
      <article className="mx-auto max-w-4xl px-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
            Documentação da API
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-600">
            A API do O Meu Banco é servida em{" "}
            <code className="rounded bg-brand-beige px-1.5 py-0.5 text-sm text-brand-dark">
              https://api.omeubanco.xyz
            </code>{" "}
            e usa autenticação bearer para chamadas protegidas. Esta página reúne
            os links públicos necessários para descoberta por humanos e agentes.
          </p>
        </header>

        <section className="mt-12 rounded-3xl border border-gray-100 bg-brand-beige p-8">
          <h2 className="text-xl font-bold text-brand-dark">Resumo rápido</h2>
          <div className="mt-4 space-y-3 text-gray-700">
            <p>
              <strong>Base URL:</strong>{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-brand-dark">
                https://api.omeubanco.xyz
              </code>
            </p>
            <p>
              <strong>Formato principal:</strong> JSON sobre HTTPS.
            </p>
            <p>
              <strong>Saúde:</strong>{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-sm text-brand-dark">
                GET /health
              </code>
            </p>
            <p>
              <strong>OpenAPI:</strong>{" "}
              <a
                href="/docs/api/openapi.json"
                className="font-semibold text-brand-dark underline underline-offset-2"
              >
                /docs/api/openapi.json
              </a>
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-brand-dark">Autenticação</h2>
          <div className="mt-4 space-y-4 text-gray-700">
            <p>
              Os endpoints protegidos exigem{" "}
              <code className="rounded bg-brand-beige px-1.5 py-0.5 text-sm text-brand-dark">
                Authorization: Bearer &lt;token&gt;
              </code>
              . O token é emitido pelo backend após login de pais, responsáveis
              ou crianças.
            </p>
            <p>
              O backend também publica metadados de protected resource em{" "}
              <a
                href="https://api.omeubanco.xyz/.well-known/oauth-protected-resource"
                className="font-semibold text-brand-dark underline underline-offset-2"
              >
                /.well-known/oauth-protected-resource
              </a>{" "}
              para facilitar descoberta automatizada do recurso protegido.
            </p>
            <p>
              A API ainda não expõe um authorization server OAuth/OIDC público e
              completo. Os fluxos atuais continuam sendo first-party e o bearer
              token é emitido pelo próprio backend após autenticação do usuário.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-brand-dark">Grupos de endpoint</h2>
          <div className="mt-6 overflow-hidden rounded-3xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-brand-beige/60">
                <tr>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-brand-dark">
                    Caminho
                  </th>
                  <th className="px-5 py-4 text-left text-sm font-semibold text-brand-dark">
                    Descrição
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {endpointGroups.map((item) => (
                  <tr key={item.path}>
                    <td className="px-5 py-4 align-top text-sm font-medium text-brand-dark">
                      <code>{item.path}</code>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {item.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-brand-dark">
            Endpoints de descoberta
          </h2>
          <div className="mt-6 space-y-4">
            {discoveryEndpoints.map((item) => (
              <div
                key={item.path}
                className="rounded-2xl border border-gray-100 bg-white p-5"
              >
                <p className="font-semibold text-brand-dark">
                  <code>{item.path}</code>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </article>
    </div>
  );
}
