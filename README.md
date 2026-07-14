# VirtualAddress

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-纯%20JavaScript-blue)]()
[![No Backend](https://img.shields.io/badge/后端-无-lightgrey)]()
[![Privacy](https://img.shields.io/badge/隐私-优先-brightgreen)]()

> 多国家/地区的地址与相关测试数据生成引擎、MAC 工具、基础样式等。
> 纯前端，零后端，可直接集成或静态托管。

---

## 目录

- [本仓库包含什么](#本仓库包含什么)
- [快速开始](#快速开始)
- [配置选项](#配置选项)
- [API 参考](#api-参考)
- [数据路径配置](#数据路径配置)
- [本地运行](#本地运行)
- [仓库结构](#仓库结构)
- [部署指南](#部署指南)
- [数据来源](#数据来源)
- [贡献指南](#贡献指南)
- [路线图](#路线图)
- [License](#license)

---

## 本仓库包含什么

| 部分 | 说明 |
|------|------|
| **`src/`** | 可集成到你项目中的引擎（`address-generator.js`、`mac-generator.js`、`utils.js`、`config.js` 等）与 **`src/css/main.css`**。 |
| **`data/tf-preview.pack.json`** | 随仓附带的**演示用**美国免税州地址抽样（**仅 AK、DE、MT、OR**，中性文件名；**不是**线站全量库）。 |
| **根目录 `index.html` + `test-harness.mjs`** | 在本地 HTTP 下测试 `src`、查看与主站类似的**卡片式结果 UI**。 |
| **`启动测试.bat`** | Windows 下在仓库根目录启动静态服务并打开浏览器。 |

**不包含：** 正式站页面模板、内部运维脚本、以及线上环境使用的**全量数据资产**（其具体文件名与目录结构不在本仓库文档中列出）。随仓仅公开上述 **`.pack.json`** 演示数据。

---

## 快速开始

### 方式一：直接使用（适合简单场景）

如果你的网站有 `data/` 目录，可以直接使用，无需配置：

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./src/css/main.css">
</head>
<body>
  <script type="module">
    import { generateUSAddress } from './src/js/address-generator.js';

    // 直接使用，会自动检测 data/ 目录
    const address = await generateUSAddress('CA');
    console.log(address);
  </script>
</body>
</html>
```

### 方式二：自定义数据路径（推荐）

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./src/css/main.css">
</head>
<body>
  <script type="module">
    import { configure } from './src/js/config.js';
    import { generateUSAddress } from './src/js/address-generator.js';

    // 配置你的数据路径
    configure({
      dataBasePath: 'my-custom-data/',
      autoDetectPaths: false
    });

    const address = await generateUSAddress('CA');
    console.log(address);
  </script>
</body>
</html>
```

---

## 配置选项

### `dataBasePath`（字符串，可选）

你的数据文件的基础路径。例如：
- `'my-data/'` — 相对路径
- `'/static/data/'` — 绝对路径
- `'https://cdn.example.com/data/'` — CDN 路径

**注意：** 如果不设置，代码会自动检测路径。

### `autoDetectPaths`（布尔值，默认 `true`）

是否启用自动路径检测。如果设为 `false`，则只使用 `dataBasePath` 指定的路径。

**建议：**
- 如果你的网站结构简单，设置 `dataBasePath` 并关闭 `autoDetectPaths`
- 如果你的网站有多语言目录结构，保持 `autoDetectPaths: true`

### 数据文件结构

你需要准备以下 JSON 数据文件（放在你配置的 `dataBasePath` 目录下）：

- `usData.json` — 美国地址数据
- `hkData.json` — 香港地址数据
- `ukData.json` — 英国地址数据
- `caData.json` — 加拿大地址数据
- `jpData.json` — 日本地址数据
- `jpNamesData.json` — 日本姓名数据
- `inData.json` — 印度地址数据
- `twData.json` — 台湾地址数据
- `sgData.json` — 新加坡地址数据
- `deData.json` — 德国地址数据
- `namesData.json` — 通用姓名数据
- `macOuiData.json` — MAC OUI 数据（用于 MAC 工具）

> **注意：** 本开源仓库不包含这些数据文件。你需要自己准备数据。

---

## API 参考

所有生成函数均从 `src/js/address-generator.js` 导入。

| 函数 | 说明 |
|------|------|
| `generateUSAddress(stateCode?)` | 美国地址 |
| `generateHKAddress()` | 香港地址 |
| `generateUKAddress()` | 英国地址 |
| `generateCAAddress()` | 加拿大地址 |
| `generateJPAddress()` | 日本地址 |
| `generateINAddress()` | 印度地址 |
| `generateTWAddress()` | 台湾地址 |
| `generateSGAddress()` | 新加坡地址 |
| `generateDEAddress()` | 德国地址 |
| `generateTaxFreeAddress(stateCode?)` | 美国免税州地址 |
| `generateIdentityInfo()` | 身份信息（姓名、出生日期等） |
| `generateCreditCardInfo()` | 信用卡信息（测试用） |
| `pickRandomTaxFreePreviewRow(stateCode)` | 从演示数据中随机取一行 |

MAC 相关接口见 `src/js/mac-generator.js`。

### 配置路径

```javascript
import { configure } from './src/js/config.js';

configure({
  dataBasePath: 'assets/',
  autoDetectPaths: false,
  dataFiles: {
    usRegions: 'assets/a.json',
    names: 'assets/b.json',
    taxfreePreviewPack: 'assets/demo.pack.json',
  },
});
```

---

## 数据路径配置

引擎**不硬编码**任何特定业务环境下的文件名。所有数据路径来自 `src/js/config.js` 中的 `dataFiles` 映射（可通过 `configure({ dataFiles: { … } })` 整体覆盖）。默认值为**中性**相对路径，仅表示「开源仓库里若放文件，建议叫什么名字」；**你可以改成任意路径**（含仅自己服务器可见的名称），不必与默认一致。

| `dataFiles` 键 | 默认相对路径（可被 `configure` 改掉） |
|-----------------|--------------------------------------|
| `usRegions` | `data/addr-regions-us.json` |
| `names` | `data/names-pool.json` |
| `hkRegions` | `data/addr-regions-hk.json` |
| `ukRegions` | `data/addr-regions-uk.json` |
| `caRegions` | `data/addr-regions-ca.json` |
| `jpRegions` | `data/addr-regions-jp.json` |
| `jpNames` | `data/names-pool-jp.json` |
| `inRegions` | `data/addr-regions-in.json` |
| `twRegions` | `data/addr-regions-tw.json` |
| `sgRegions` | `data/addr-regions-sg.json` |
| `deRegions` | `data/addr-regions-de.json` |
| `taxfreePreviewPack` | `data/tf-preview.pack.json`（随仓演示抽样） |
| `macOui` | `data/oui-registry.json` |

### 私有部署示例

```javascript
import { configure } from './src/js/config.js';

configure({
  dataBasePath: 'assets/',
  autoDetectPaths: false,
  dataFiles: {
    usRegions: 'assets/a.json',
    names: 'assets/b.json',
    taxfreePreviewPack: 'assets/demo.pack.json',
  },
});
```

**JSON 内部结构**仍须与引擎读取的字段一致（与本引擎的格式约定相同）；仅**磁盘路径与文件名**由你掌控。

---

## 本地运行

### 已具备

- `src/js/main.js`：页面主控
- `usa-address/` `hk-address/` `uk-address/`：可运行页面
- 数据：`usData.json` `hkData.json` `ukData.json` `names-pool.json` `us_taxfree.min.json`

### 启动

1. 将整个 **`KY`** 文件夹放在本地。
2. **Windows：** 双击 **`启动测试.bat`**（会在仓库根目录启动服务，并尝试打开浏览器）。
3. 浏览器访问 **`http://localhost:8000/`**（以本仓库 `index.html` 为入口）。

或用命令行手动启动：

```bash
# 项目根目录
npx --yes serve -l 5173 .
```

访问：
- http://localhost:5173/usa-address/
- http://localhost:5173/hk-address/
- http://localhost:5173/uk-address/

**注意：** 勿用 `file://` 打开依赖 `fetch('data/...')` 与 ES Module 的测试页，否则会失败。

依赖：**Python 3**（或 PHP / Node `npx`）。仅静态文件服务，无需数据库或 Node 构建步骤。

---

## 仓库结构

```
KY/
├── src/
│   ├── js/
│   │   ├── address-generator.js
│   │   ├── taxfree-preview-pack.js    # 读取 tf-preview.pack.json，随机抽样行
│   │   ├── mac-generator.js
│   │   ├── storage.js
│   │   ├── language-switcher.js
│   │   ├── utils.js
│   │   └── config.js
│   └── css/
│       └── main.css
├── data/
│   └── tf-preview.pack.json           # 演示用抽样（四州）
├── index.html                         # 本地测试入口
├── test-harness.mjs
├── 启动测试.bat                       # Windows 静态服务助手
├── LICENSE
├── usa-address/                       # 美国地址页面
├── hk-address/                        # 香港地址页面
├── uk-address/                        # 英国地址页面
└── README.md
```

---

## 部署指南

本仓库可作为**纯静态站点**托管，无需构建步骤。

### Cloudflare Pages

1. 将代码推送到 GitHub/GitLab 仓库
2. 登录 Cloudflare Dashboard → **Workers & Pages** → **Pages** → **Connect to Git**
3. 选择仓库，构建配置：
   - **Framework preset:** None
   - **Build command:** 留空
   - **Build output directory:** 留空
4. 点击 **Save and Deploy**

Cloudflare 会自动分配 `.pages.dev` 域名并强制 HTTPS。

### VPS（Nginx）

上传文件后，配置 Nginx 静态站点：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/address;
    index index.html;

    gzip on;
    gzip_types text/html text/css application/javascript application/json;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

HTTPS 推荐使用 certbot 自动申请：

```bash
sudo certbot --nginx -d your-domain.com
```

### VPS（极简版，无 Nginx）

上传文件到 VPS 后，直接用 Node `serve` 启动：

```bash
cd /opt/address
npx serve -l 80 .
```

后台运行：

```bash
nohup npx serve -l 80 . > serve.log 2>&1 &
```

### 部署验证

部署后确认：
- 首页能正常加载
- 各地址页可正常切换
- 保存/导出/导入功能可用
- 浏览器 Console 无 404 或 CORS 错误

---

## 数据来源

### 本地开源 vs 线上完整版

| 项目 | 说明 |
|------|------|
| 开源仓库 | 引擎代码 + 预览数据，**不含**完整 JSON 资产与页面模板 |
| 完整线上 | 9 国/地区地址 + 免税州 + 身份/信用卡/MAC |

### 地址数据来源

**美国**

- [US Census Bureau](https://www.census.gov/)：州/县/城市地理与人口
- [USPS ZIP Code](https://www.usps.com/)：邮编区划（商用需授权）
- [OpenAddresses](https://openaddresses.io/)：众包街道门牌
- [GeoNames](https://www.geonames.org/)：地名库

**英国**

- [Royal Mail PAF](https://www.poweredbypaf.com/)：官方地址库（商用授权）
- [OS Open Data](https://www.ordnancesurvey.co.uk/) / Code-Point Open：邮编中心点
- Wikipedia / 公开行政区列表

**香港**

- 香港特区行政区划公开资料（港岛/九龙/新界 + 分区）
- 常见街道与商场/大厦名称（公开地图与政府资料）
- 香港**无官方邮编体系**，表单常用 `000000` 占位

**通用姓名**

- 各国统计局姓名频率表、公开姓名语料（注意许可协议）

### 合规提醒

生成数据为虚构示例，仅用于开发/测试/教育。禁止用于欺诈、盗用身份等违法用途。

---

## 贡献指南

我们欢迎任何形式的贡献：

- 报告 Bug（通过 GitHub Issues）
- 提出功能建议
- 提交代码改进（Pull Request）
- 改进文档

### 提交代码

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feature/AmazingFeature`）
3. 提交更改（`git commit -m 'feat: add AmazingFeature'`）
4. 推送到分支（`git push origin feature/AmazingFeature`）
5. 开启 Pull Request

### 代码规范

- 保持代码风格与现有代码一致
- 添加必要的注释，特别是复杂逻辑
- 确保更改不会破坏现有功能
- 如果可能，添加或更新相关测试

### 行为准则

- 保持友好和尊重
- 欢迎不同观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情

---

## 路线图

### 短期计划

- [ ] 提供 TypeScript 类型定义文件（`.d.ts`）
- [ ] 完善 API 文档与使用示例
- [ ] 添加更多集成示例（React、Vue、原生 JS 等）
- [ ] 拆分各国地址生成逻辑为独立模块，支持按需引入
- [ ] 优化数据加载与缓存机制

### 中期计划

- [ ] 提供 npm 包发布
- [ ] 支持通过配置文件自定义地址生成规则
- [ ] 建立插件系统，允许社区贡献自定义地址格式
- [ ] 提供更多语言版本的文档

### 长期愿景

- 成为前端测试数据生成领域的标准工具之一
- 建立活跃的开源社区
- 与更多开发工具和测试框架集成
- 持续关注数据隐私与合规性

---

## License

MIT，见 [LICENSE](LICENSE)。
