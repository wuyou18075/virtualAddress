// Cloudflare Worker 入口 - 静态资源由 assets 配置自动托管
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // API 示例
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      });
    }

    // 404（静态资源未匹配时自动回退到 404.html）
    return new Response("Not Found", { status: 404 });
  },
};