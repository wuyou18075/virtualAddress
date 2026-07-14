# VirtualAddress

多国家/地区地址与测试数据生成工具，纯前端运行。

## 功能

- **地址生成**：美国、香港、英国、加拿大、日本、印度、台湾、新加坡、德国等国家/地区地址
- **免税州地址**：从演示数据中随机生成美国免税州地址
- **身份信息**：姓名、出生日期等虚拟身份数据
- **信用卡信息**：测试用信用卡号生成
- **MAC 地址工具**：MAC 地址生成与解析
- **数据可配置**：所有数据路径可自定义，支持本地 / CDN 等多种加载方式

## 一键部署

### Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wuyou18075/virtualAddress)

点击上方按钮，登录 CF 后按提示确认即可完成部署。

### GitHub Actions 自动部署

推送 `main` 分支后自动部署到 CF Workers。

**首次配置**：在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：

| Secret 名称 | 值 |
|-------------|-----|
| `CF_API_TOKEN` | 你的 Cloudflare API Token（权限：Workers + Pages 编辑） |

之后每次 `git push origin main` 都会自动部署。

[![Deploy status](https://github.com/wuyou18075/virtualAddress/actions/workflows/deploy.yml/badge.svg)](https://github.com/wuyou18075/virtualAddress/actions/workflows/deploy.yml)

## 本地调试

Win11 下，在项目根目录执行：

```bash
npx --yes serve -l 5173 .
```

然后浏览器访问 `http://localhost:5173/`。

## CF 部署方案

### 方案一：Cloudflare Pages（推荐）

1. 源码推送到 GitHub
2. 登录 CF Dashboard → Workers & Pages → Pages → Connect to Git
3. 选择仓库，构建配置如下：

| 配置项 | 值 |
|--------|-----|
| Framework preset | None |
| Build command | 留空 |
| Build output directory | 留空 |
| Root directory | 留空 |

4. 点击 **Save and Deploy**，CF 自动分配 `.pages.dev` 域名并开启 HTTPS

### 方案二：Cloudflare Workers

直接在 CF Dashboard 创建 Worker，将项目文件（`index.html`、`src/`、`data/` 等）打包或内联到 Worker 脚本中。

```js
// 将静态资源内联或通过 import 引入
import indexHtml from "./index.html";

export default {
  async fetch(req) {
    const url = new URL(req.url);

    // 路由分发
    if (url.pathname.startsWith("/src/") || url.pathname.startsWith("/data/")) {
      // 静态资源由 CF 边缘缓存处理
      return fetch(req);
    }

    // 返回首页
    return new Response(indexHtml, {
      headers: { "content-type": "text/html;charset=utf-8" },
    });
  },
};
```

**优势：**
- 全球 300+ 边缘节点，延迟极低
- 无需管理服务器，自动扩缩容
- 免费计划每天 10 万请求，个人项目足够
- 可结合 Worker Routes 实现自定义域名

### 方案三：Cloudflare Workers + KV

将数据文件（`data/` 下的 JSON）存入 KV 命名空间，Worker 按需读取，适合数据量较大的场景。

```js
import indexHtml from "./index.html";

// 绑定 KV 命名空间（在 CF Dashboard 绑定名为 DATA_BUCKET）
// wrangler.toml 配置：
// kv_namespaces = [{ binding = "DATA_BUCKET", id = "xxx" }]

export default {
  async fetch(req) {
    const url = new URL(req.url);

    // 从 KV 获取数据
    if (url.pathname === "/api/data") {
      const data = await DATA_BUCKET.get("usData.json", "json");
      return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(indexHtml, {
      headers: { "content-type": "text/html;charset=utf-8" },
    });
  },
};
```

**优势：**
- 数据与代码分离，更新数据无需重新部署
- KV 全球只读缓存，读取速度快
- 数据文件可大于 Worker 的 1MB 脚本体积限制
- 适合管理免税州 JSON、MAC OUI 等频繁更新的数据集