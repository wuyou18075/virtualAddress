// Cloudflare Worker — static assets via wrangler assets config
// Legacy path redirects + cache/security headers for /data and /src

const LEGACY_TO_SLUG = {
  "usa-address": "usa",
  "cn-address": "cn",
  "hk-address": "hk",
  "uk-address": "uk",
  "ca-address": "ca",
  "jp-address": "jp",
  "tw-address": "tw",
  "de-address": "de",
  "sg-address": "sg",
  "mac-address": "mac",
  "taxfree": "taxfree",
};

function redirectTo(url, pathname) {
  const target = new URL(url);
  target.pathname = pathname;
  return Response.redirect(target.toString(), 301);
}

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // /address/usa-address[/index.html] → /address/usa.html
    for (const [folder, slug] of Object.entries(LEGACY_TO_SLUG)) {
      if (
        path === `/address/${folder}`
        || path === `/address/${folder}/index.html`
      ) {
        return redirectTo(url, `/address/${slug}.html`);
      }
    }

    // /usa-address[/index.html] → /address/usa.html
    for (const [folder, slug] of Object.entries(LEGACY_TO_SLUG)) {
      if (path === `/${folder}` || path === `/${folder}/index.html`) {
        return redirectTo(url, `/address/${slug}.html`);
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        }),
      );
    }

    // Let assets handler serve static files when available
    if (env.ASSETS) {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp && assetResp.status !== 404) {
        const headers = new Headers(assetResp.headers);
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        // Long cache for versioned-ish static data/scripts (path stable; 1 day)
        if (
          url.pathname.startsWith("/data/")
          || url.pathname.startsWith("/src/")
        ) {
          headers.set("Cache-Control", "public, max-age=86400");
        }
        return new Response(assetResp.body, {
          status: assetResp.status,
          statusText: assetResp.statusText,
          headers,
        });
      }
    }

    return withSecurityHeaders(new Response("Not Found", { status: 404 }));
  },
};
