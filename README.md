# VirtualAddress

多国家/地区地址与测试数据生成工具，**纯前端静态资源 + Cloudflare Worker**，无需构建步骤。

> 仅供开发 / 测试。生成的身份与卡号为虚构或测试格式，不可用于欺诈或绕过任何真实业务核验。

## 目录结构

```
├── index.html                 # 首页（IP / 中文地址转英文）
├── address/                   # 各国入口（扁平 HTML）
│   ├── usa.html
│   ├── uk.html
│   ├── cn.html
│   ├── …                      # ca/jp/hk/tw/de/sg/taxfree/mac
├── data/                      # JSON 数据
│   ├── usData.json / ukData.json / …
│   ├── us-real/{STATE}.json   # 美国真实地址分片
│   ├── us-taxfree/{STATE}.json
│   ├── jp-real/{都道府县}.json
│   └── in-pin/{STATE}.json
├── src/
│   ├── css/main.css
│   ├── js/                    # shell / generators / data-loader / …
│   └── worker.js              # 旧路径 301 + 缓存/安全头
├── test/unit.mjs              # Node 单测
├── deploy-vps.sh              # VPS 一键部署脚本
├── wrangler.toml              # CF Workers + Assets
└── .github/workflows/deploy.yml
```

## 功能概览

- 多国家/地区地址生成（US / UK / CA / JP / …）
- 美国免税州演示地址
- 身份与测试信用卡（Luhn 合法测试号）
- MAC 生成与 OUI 解析
- 首页 / 国内页：IP 附近住宅检索、中文转英文（OSM）

## 本地开发

```bash
# 静态预览（推荐日常调试）
npx --yes serve -l 5173 .

# 或带 Worker 的本地预览（301 / 头与线上一致）
npx wrangler dev
```

访问示例：

| 页面 | URL |
|------|-----|
| 首页 | http://localhost:5173/ |
| 美国 | http://localhost:5173/address/usa.html |
| 英国 | http://localhost:5173/address/uk.html |
| MAC | http://localhost:5173/address/mac.html |

单测：

```bash
node --test test/unit.mjs
```

---

## 部署方案（以当前仓库为准）

### 默认方案：Cloudflare Workers + Assets

与仓库根目录配置一致：

```toml
# wrangler.toml
name = "virtualaddress"
compatibility_date = "2026-07-14"
main = "src/worker.js"
assets = { directory = ".", not_found_handling = "auto" }
```

含义：

- **静态文件**（`index.html`、`address/`、`data/`、`src/`）由 Workers **Assets** 托管，从项目根目录整站发布
- **`src/worker.js`** 处理：旧 URL **301**、可选 `/api/*`、为 `/data` 与 `/src` 加缓存/安全头
- **无构建命令**（不是 Vite/Webpack 产物站）

#### 手动部署

1. 安装并登录 Wrangler：`npx wrangler login`
2. 在项目根目录：

```bash
npx wrangler deploy
```

3. 在 CF Dashboard → Workers 中绑定自定义域名（可选）

#### GitHub Actions 自动部署（推荐）

工作流：`.github/workflows/deploy.yml`

- **PR / push**：先跑 `node --test test/unit.mjs`
- **仅 `main` 分支 push**（非 PR）：测试通过后 `npx wrangler deploy`

首次配置：仓库 **Settings → Secrets and variables → Actions** 添加：

| Secret | 说明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token，权限至少包含 Workers 编辑与账户资源读取（部署 Assets 所需） |

之后：

```bash
git push origin main
```

[![Deploy status](https://github.com/wuyou18075/virtualAddress/actions/workflows/deploy.yml/badge.svg)](https://github.com/wuyou18075/virtualAddress/actions/workflows/deploy.yml)

#### 一键部署徽章（可选）

| 平台 | 徽章 |
|------|------|
| Cloudflare Workers | [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wuyou18075/virtualAddress) |
| Vercel | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwuyou18075%2FvirtualAddress) |

---

#### Cloudflare「Deploy to Cloudflare」按钮说明与排障

按钮链接格式（官方约定）：

```text
https://deploy.workers.cloudflare.com/?url=https://github.com/<owner>/<repo>
```

本仓库：

```markdown
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/wuyou18075/virtualAddress)
```

**按钮实际在做什么：** 打开 CF 控制台向导，把该 GitHub 仓库当作 **Worker 模板** 导入并部署（读取根目录 `wrangler.toml` + Assets）。它**不是**「在已登录的 Git 账号下自动勾选某一个 org/用户」的保证；Git 账号是否出现、是否默认选中，取决于你在 Cloudflare 侧是否已完成 GitHub 授权。

**若 Git 账户没有自动选上，按下面排查：**

1. **先绑定 GitHub（最重要）**  
   登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → 右上角头像 → **My Profile** → **Authentication** / 或 Workers 导入流程中的 **Connect GitHub**。  
   在 GitHub 打开 [Applications → Authorized OAuth Apps / Cloudflare](https://github.com/settings/installations)，确认 Cloudflare 已安装，并勾选能访问 `virtualAddress` 的账号或组织（Organization 需 Grant）。

2. **多个 GitHub 账号 / 组织**  
   浏览器若同时登录多个 GitHub，向导可能停在「选择账号」且不预填。处理：退出多余 GitHub 会话，或只用无痕窗口只登目标账号后再点徽章。

3. **仓库权限不足**  
   私有库或 org 库未给 Cloudflare GitHub App 授权时，列表为空或无法选中。到 GitHub → Settings → **Integrations → Cloudflare** → Repository access 选 All / Only select，包含本仓库。

4. **更稳的替代（推荐自用仓库）**  
   一键按钮适合「别人 fork/模板部署」。**维护自己的仓库**时更可靠的是：  
   - Dashboard → **Workers & Pages** → **Create** → **Import a repository**（此时会强制走 Git 连接 UI，账号列表更清晰）；或  
   - 配置 Actions + `CF_API_TOKEN` 后 `git push`（无需在按钮里选 Git）。

5. **链接参数**  
   保持 `url=` 为 **HTTPS 的 `github.com/owner/repo` 根地址**（不要带 `.git` 后缀、不要带 `/tree/main`）。当前写法已符合 [Deploy to Cloudflare buttons](https://developers.cloudflare.com/workers/platform/deploy-buttons/) 的常见用法。

6. **部署成功后**  
   确认 Worker 名称与 `wrangler.toml` 中 `name = "virtualaddress"` 一致或可在向导里改名；Assets 根目录为仓库根，无需填 Build command。

#### Worker 提供的路由兼容

| 旧路径 | 新路径 |
|--------|--------|
| `/usa-address/` | `/address/usa.html` |
| `/address/usa-address/` | `/address/usa.html` |
| （其它 `*-address` / `taxfree` 同理） | `/address/{slug}.html` |

---

### 备选 C：VPS（Nginx + Let's Encrypt）

适合自管服务器、不想依赖第三方平台。仓库提供一键脚本：

#### 快速部署

```bash
# 1. SSH 登录 VPS
ssh root@你的VPS_IP

# 2. 安装 git（如果新机器没有）
apt update && apt install -y git

# 3. 克隆项目
git clone https://github.com/wuyou18075/virtualAddress.git
cd virtualAddress

# 4. 运行脚本
sudo bash deploy-vps.sh
```

按提示输入域名，脚本自动完成：

| 步骤 | 内容 |
|------|------|
| 安装 Nginx | 检测并安装（apt/yum/dnf） |
| 安装 Certbot | 检测并安装，自动申请 Let's Encrypt 证书 |
| DNS 检查 | 检测域名是否已解析到本机 IP |
| 部署静态文件 | rsync 到 `/var/www/virtualaddress` |
| 生成 Nginx 配置 | 安全头、数据缓存、旧路径 301 兼容 |
| HTTPS 跳转 | 自动配置 |
| 证书续期 | 添加 cron（每天 3:00） |
| 防火墙提示 | 检测 UFW 并提示放行 80/443 |

#### 手动更新

```bash
cd /root/virtualAddress
git pull
sudo bash deploy-vps.sh
```

> **注意：** VPS 部署不运行 `src/worker.js`（Cloudflare Worker 逻辑），脚本内联的 Nginx 配置已实现等效的 301 跳转和安全头。

---

### 备选 A：Vercel 一键 / Git 导入（静态站）

适合不想碰 Cloudflare、只要全球 CDN 静态托管的场景。仓库已提供：

- [`vercel.json`](./vercel.json) — 旧路径 **301**、`/data` 与 `/src` 缓存与安全头  
- [`.vercelignore`](./.vercelignore) — 忽略测试、文档、`.git` 等，减小上传体积  

> **注意：** Vercel **不会执行** `src/worker.js`。旧链兼容依赖 `vercel.json` 的 `redirects`，与 CF Worker 行为对齐的是「跳转 + 静态头」，不是完整 Worker 运行时。

#### 方式 1：Deploy 徽章（Clone 模板）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwuyou18075%2FvirtualAddress)

或完整 URL：

```text
https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fwuyou18075%2FvirtualAddress
```

流程：登录 Vercel → 授权 GitHub → 创建项目（可 fork 到你的账号）→ Deploy。  
静态站 **无 Build Command**；Framework Preset 选 **Other**。

#### 方式 2：Import 已有仓库（推荐你自己的 fork）

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository**  
2. 选择 `virtualAddress`  
3. 配置：

| 项 | 值 |
|----|-----|
| Framework Preset | Other |
| Root Directory | `.`（默认） |
| Build Command | *留空* / 关闭 |
| Output Directory | *留空*（发布仓库根目录静态文件） |
| Install Command | *留空*（无 npm 依赖） |

4. Deploy → 获得 `*.vercel.app` 域名  

#### 方式 3：CLI

```bash
npx vercel
# 生产环境
npx vercel --prod
```

#### Vercel 与 Cloudflare 怎么选

| | Cloudflare Workers + Assets | Vercel |
|--|-----------------------------|--------|
| 一键入口 | Deploy to Cloudflare 按钮 | Deploy with Vercel 按钮 |
| `src/worker.js` | ✅ 会跑（301/头） | ❌ 不跑（用 `vercel.json` 代替跳转） |
| 持续部署 | GitHub Actions + Token 或 CF Git 集成 | Vercel Git 集成（绑仓库后自动） |
| 配置文件 | `wrangler.toml` | `vercel.json` |
| 适合 | 已用 CF / 要 Worker 扩展 | 只要静态、团队已在 Vercel |

---

### 备选 B：Cloudflare Pages（仅静态）

适合只想托管静态文件、**不需要** Worker 逻辑时：

1. Dashboard → Workers & Pages → **Pages** → Connect to Git  
2. 构建配置：

| 项 | 值 |
|----|-----|
| Framework preset | None |
| Build command | *留空* |
| Build output directory | `/` 或 `.`（以 Dashboard 要求为准，本质为仓库根） |
| Root directory | 留空 |

3. 部署后使用 `.pages.dev` 或自定义域名  

**限制：**

- **不会执行** `src/worker.js`（无 Worker 侧逻辑）  
- 旧路径 301 需另配 Pages `_redirects` / Redirects 规则，或改用本仓库的 **Workers + Assets** / **Vercel + vercel.json**

---

### 不推荐作为默认：纯 Worker 脚本内联 HTML

旧文档中「把整站 HTML import 进 Worker」的写法已过时。当前请使用 **Assets 目录托管**，避免体积与维护成本问题。

### 可选进阶：Workers + KV

仅在「数据频繁改、不想每次 redeploy 静态资源」时考虑：

1. 创建 KV 命名空间，在 `wrangler.toml` 绑定  
2. 用脚本把 `data/**/*.json` 写入 KV  
3. 在 `worker.js` 增加 `/data/*` 从 KV 读出并返回  

默认仓库**未启用** KV；静态 Assets 已足够个人/中小流量场景。

---

### 部署检查清单

- [ ] `wrangler.toml` 中 `assets.directory = "."` 且 `main = "src/worker.