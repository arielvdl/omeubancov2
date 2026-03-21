export interface Env {
  ORIGIN_HOST: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
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

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept-Language, X-Cron-Secret');
    responseHeaders.set('Access-Control-Expose-Headers', '*');

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
