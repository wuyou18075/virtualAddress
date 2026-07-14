# 部署指南 — Cloudflare Pages

> 适用于本项目（纯静态多页站点，无构建步骤，约 6MB）。部署后自动获得全球 CDN、强制 HTTPS、自定义域名、自动重新部署。

## 前置条件

- 一个 [GitHub](https://github.com) / [GitLab](https://gitlab.com) 账号
- 一个 [Cloudflare](https://dash.cloudflare.com) 账号（免费计划即可）
- 将项目代码推送到 GitHub 或 GitLab 仓库

## 第一步：推送代码到 Git 仓库

```bash
# 如果你还没有初始化仓库
cd F:\github-project\real-random-taxfree-address
git init
git add -A
git commit -m "feat: initial commit"

# 关联远程仓库并推送
git remote add origin https://github.com/你的用户名/你的仓库名.git
git branch -M main
git push -u origin main
```

> 如果用 GitLab，步骤相同，远端地址换为 `https://gitlab.com/你的用户名/你的仓库名.git`。

## 第二步：连接 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧边栏点击 **Workers & Pages**
3. 点击 **Pages** 标签 → **Create** → **Connect to Git**
4. 授权 Cloudflare 访问你的 GitHub 或 GitLab 账号
5. 选择存放本项目的仓库

## 第三步：配置构建设置

进入构建配置页面后，按以下填写：

| 字段 | 值 |
|---|---|
| **Framework preset** | None（不要选任何框架） |
| **Build command** | 留空（本项目无构建步骤） |
| **Build output directory** | 留空，或填 `/` |
| **Root directory** | 留空（以项目根目录部署） |
| **Environment variables** | 无需添加 |

> 不要在任何字段里填 `output` 或 `dist`——本项目的 HTML/JS/CSS/JSON 就在根目录下，直接作为静态文件提供。

点击 **Save and Deploy**。Cloudflare 会自动拉取代码并上线。

首次部署约 1-2 分钟，完成后你会得到一个 `.pages.dev` 域名，例如：
```
https://你的项目名.xxxx.pages.dev
```

## 第四步：后续更新

每次向主分支（`main`）推送代码，Cloudflare Pages 都会自动重新部署，约 1 分钟内生效。

```bash
git add -A
git commit -m "feat: 更新内容"
git push
```

也可以手动触发重新部署：Cloudflare Dashboard → Pages → 你的项目 → **Deployments** → **Deploy again**。

## 自定义域名（可选）

1. Cloudflare Dashboard → Pages → 你的项目 → **Custom domains**
2. 点 **Setup a custom domain**，输入你的域名（例如 `address.example.com`）
3. Cloudflare 会自动添加 DNS 记录并签发 SSL 证书
4. 等待证书颁发完成（通常 1-2 分钟）
5. 现在即可通过自定义域名 HTTPS 访问

> 如果域名未使用 Cloudflare DNS 托管，你需要到域名注册商将 NS 指向 Cloudflare。

## 部署验证

打开浏览器访问你的 `.pages.dev` 或自定义域名，确认：

- 首页能加载并显示 IP 定位按钮
- 点击「按 IP 找附近住宅地址」能正常请求定位 → 反查 → 展示结果
- 导航栏各页面可正常切换
- 各地址页的保存/导出/导入功能可用（localStorage 正常）
- 打开浏览器开发者工具 → Console，确认无跨域或 404 错误

## 注意事项

1. **HTTPS 已自动配置**：Cloudflare Pages 默认强制 HTTPS。浏览器定位 API（`navigator.geolocation`）和 ES modules 均需要 HTTPS 环境，部署后正常使用
2. **localStorage 以域名为范围**：`.pages.dev` 域名下保存的数据与自定义域名下的数据**不互通**。确定正式域名后再开始大量保存
3. **数据文件已包含**：`data/` 下的 JSON 文件跟随仓库一并部署，运行时页面通过 `fetch()` 加载它们，无需额外操作
4. **无后端，纯静态**：所有地址生成与地理编码（Nominatim / IP 定位）均由浏览器直接调用第三方 API，不经过你自己的服务器
5. **无需环境变量、无需 API Key**——零配置即可运行

## 完整架构示意

```
用户浏览器
    │
    ├─→ Cloudflare CDN (全球边缘节点)
    │      │
    │      └─→ 提供 HTML / JS / CSS / JSON 静态文件
    │
    ├─→ nominatim.openstreetmap.org  (地理编码/反查)
    ├─→ ipwho.is / get.geojs.io …     (IP 定位)
    └─→ www.google.com/maps            (验证链接)
```

所有计算在浏览器端完成，后端仅做文件托管。