export interface Env {
  ORIGIN_HOST: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Block internal/cron routes from public access
    if (url.pathname.startsWith('/api/internal')) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const originUrl = `https://${env.ORIGIN_HOST}${url.pathname}${url.search}`;

    const headers = new Headers(request.headers);
    headers.set('Host', env.ORIGIN_HOST);
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ray');

    const originRequest = new Request(originUrl, {
      method: request.method,
      headers,
      body: request.body,
      redirect: 'follow',
    });

    const response = await fetch(originRequest);

    // Pass through CORS headers from the backend instead of overriding with wildcard
    const responseHeaders = new Headers(response.headers);

    // Add security headers
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Frame-Options', 'DENY');
    responseHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: responseHeaders,
      });
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
