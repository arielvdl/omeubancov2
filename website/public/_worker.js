const DISCOVERY_LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
  '</docs/api>; rel="service-doc"; type="text/html"',
  '</docs/api/openapi.json>; rel="service-desc"; type="application/openapi+json"',
];

const LINK_HEADER_PATHS = new Set(["/", "/privacidade", "/termos", "/suporte", "/docs/api"]);
const MARKDOWN_PATHS = {
  "/": "/__markdown/index.md",
  "/privacidade": "/__markdown/privacidade.md",
  "/termos": "/__markdown/termos.md",
  "/suporte": "/__markdown/suporte.md",
  "/docs/api": "/__markdown/docs-api.md",
};

function normalizePathname(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname || "/";
}

function acceptsMarkdown(acceptHeader) {
  return typeof acceptHeader === "string" && acceptHeader.includes("text/markdown");
}

function mergeHeaderValue(headers, key, value) {
  const current = headers.get(key);
  if (!current) {
    headers.set(key, value);
    return;
  }

  const values = current.split(",").map((item) => item.trim());
  if (!values.includes(value)) {
    headers.set(key, `${current}, ${value}`);
  }
}

function withDiscoveryHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  if (LINK_HEADER_PATHS.has(pathname)) {
    for (const link of DISCOVERY_LINKS) {
      mergeHeaderValue(headers, "Link", link);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function estimateMarkdownTokens(markdown) {
  const normalized = markdown.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "0";
  }

  return String(Math.ceil(normalized.length / 4));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = normalizePathname(url.pathname);

    if (request.method !== "GET" && request.method !== "HEAD") {
      const response = await env.ASSETS.fetch(request);
      return withDiscoveryHeaders(response, pathname);
    }

    if (acceptsMarkdown(request.headers.get("Accept")) && pathname in MARKDOWN_PATHS) {
      const markdownUrl = new URL(request.url);
      markdownUrl.pathname = MARKDOWN_PATHS[pathname];

      const markdownRequest = new Request(markdownUrl.toString(), {
        method: "GET",
        headers: request.headers,
      });
      const markdownAsset = await env.ASSETS.fetch(markdownRequest);

      if (markdownAsset.ok) {
        const markdown = await markdownAsset.text();
        const headers = new Headers(markdownAsset.headers);
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        headers.set("X-Markdown-Tokens", estimateMarkdownTokens(markdown));
        mergeHeaderValue(headers, "Vary", "Accept");

        for (const link of DISCOVERY_LINKS) {
          if (LINK_HEADER_PATHS.has(pathname)) {
            mergeHeaderValue(headers, "Link", link);
          }
        }

        return new Response(request.method === "HEAD" ? null : markdown, {
          status: 200,
          headers,
        });
      }
    }

    const response = await env.ASSETS.fetch(request);

    if (LINK_HEADER_PATHS.has(pathname)) {
      const headers = new Headers(response.headers);
      mergeHeaderValue(headers, "Vary", "Accept");
      for (const link of DISCOVERY_LINKS) {
        mergeHeaderValue(headers, "Link", link);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};
