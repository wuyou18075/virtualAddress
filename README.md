# MockAddress Core

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-纯%20JavaScript-blue)]()
[![No Backend](https://img.shields.io/badge/后端-无-lightgrey)]()
[![Privacy](https://img.shields.io/badge/隐私-优先-brightgreen)]()

> 本仓库为 MockAddress 的**开源前端核心**：多国家/地区的地址与相关测试数据生成逻辑、MAC 工具、基础样式等。  
> 完整线上产品：<https://mockaddress.com/>  
> **English:** [README_EN.md](./README_EN.md)

---

## 本仓库包含什么

| 部分 | 说明 |
|------|------|
| **`src/`** | 可集成到你项目中的引擎（`address-generator.js`、`mac-generator.js`、`utils.js`、`config.js` 等）与 **`src/css/main.css`**。 |
| **`data/tf-preview.pack.json`** | 随仓附带的**演示用**美国免税州地址抽样（**仅 AK、DE、MT、OR**，中性文件名；**不是**线站全量库）。 |
| **根目录 `index.html` + `test-harness.mjs`** | 在本地 HTTP 下测试 `src`、查看与主站类似的**卡片式结果 UI**。 |
| **`启动测试.bat`** | Windows 下在仓库根目录启动静态服务并打开浏览器（与常见本地静态站习惯一致）。 |

**不包含：** 正式站页面模板、内部运维脚本、以及线上环境使用的**全量数据资产**（其具体文件名与目录结构不在本仓库文档中列出）。随仓仅公开上述 **`.pack.json`** 演示数据。

---

## 数据路径：引擎如何找 JSON

引擎**不硬编码**任何特定业务环境下的文件名。所有数据路径来自 **`src/js/config.js`** 中的 **`dataFiles`** 映射（可通过 **`configure({ dataFiles: { … } })`** 整体覆盖）。默认值为**中性、与线站无关**的相对路径，仅表示「开源仓库里若放文件，建议叫什么名字」；**你可以改成任意路径**（含仅自己服务器可见的名称），不必与默认一致。

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

私有部署示例（路径仅作演示，可指向内部任意文件）：

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

**JSON 内部结构**仍须与引擎读取的字段一致（与 MockAddress 公开引擎的格式约定相同）；仅**磁盘路径与文件名**由你掌控，本仓库文档**不**描述任何线上环境的真实目录。

---

## 仓库结构（节选）

```
KY/
├── src/
│   ├── js/
│   │   ├── address-generator.js
│   │   ├── taxfree-preview-pack.js   # 读取 tf-preview.pack.json，随机抽样行
│   │   ├── mac-generator.js
│   │   ├── storage.js
│   │   ├── language-switcher.js
│   │   ├── utils.js
│   │   └── config.js
│   └── css/
│       └── main.css
├── data/
│   └── tf-preview.pack.json          # 演示用抽样（四州）
├── index.html                        # 本地测试入口
├── test-harness.mjs
├── 启动测试.bat
├── LICENSE
├── CONTRIBUTING.md
├── ROADMAP.md
├── README_CN.md
└── README_EN.md
```

---

## 本地运行（测试 `src`）

1. 将整个 **`KY`** 文件夹放在本地。
2. **Windows：** 双击 **`启动测试.bat`**（会在仓库根目录启动服务，并尝试打开浏览器）。  
3. 浏览器访问 **`http://localhost:8000/`**（以本仓库 `index.html` 为入口）。
4. **勿**用 `file://` 打开依赖 `fetch('data/...')` 与 ES Module 的测试页，否则会失败。

依赖：系统已安装 **Python 3**（或 bat 中备选的 PHP / Node `npx`）。仅静态文件服务，无需数据库或 Node 构建步骤。

---

## 使用方式（集成 `src`）

### 配置数据目录与单文件路径

```html
<script type="module">
  import { configure } from './src/js/config.js';
  import { generateUSAddress } from './src/js/address-generator.js';

  configure({
    dataBasePath: 'my-data/',
    autoDetectPaths: false,
    // 可选：逐键覆盖 dataFiles，对接自有文件名
    // dataFiles: { usRegions: 'my-data/xxx.json', names: 'my-data/yyy.json' }
  });

  const address = await generateUSAddress('CA');
  console.log(address);
</script>
```


### 免税州 **真实抽样行**（与 `tf-preview.pack.json` 一致）

```javascript
import {
  pickRandomTaxFreePreviewRow,
  addressFromTaxFreePreviewRow
} from './src/js/taxfree-preview-pack.js';

const row = await pickRandomTaxFreePreviewRow('DE');
const addr = await addressFromTaxFreePreviewRow(row, 'Delaware');
// addr 含 phone 时：与 generateUSAddress 相同，从 usRegions.states.DE.area_codes 随机取区号再 generatePhoneNumber；无该文件时退回内置小池
```

### `generateTaxFreeAddress` 说明

`generateTaxFreeAddress()` 内部调用 **`generateUSAddress()`**，走引擎的**合成地址**逻辑：须在你本地的 `data/`（或通过 `configure` 配置的目录）中自备**一整套**数据文件；**本 README 不列举这些文件的名称，也不描述线上环境的存放方式**。这与 **`tf-preview.pack.json`** 的演示抽样**不是同一套数据**。需要与演示包同源的随机行时，请使用 **`taxfree-preview-pack.js`**。

### 其它导出函数（需自备对应 `data/*.json`）

引擎还支持香港、英国、加拿大、日本、印度、台湾、新加坡、德国等生成函数，以及 `generateIdentityInfo`、`generateCreditCardInfo`、MAC 相关接口等，详见 `src/js/address-generator.js`、`mac-generator.js`。完整功能需自行准备与引擎 `loadData` 约定一致的数据文件（本仓库不随附全量库）。

---

开源范围、不适用场景、部署思路、路线图等可与 [CONTRIBUTING.md](./CONTRIBUTING.md)、[ROADMAP.md](./ROADMAP.md) 及下方章节对照。

---

## 部署（静态托管）

将本仓库作为**纯静态站点**托管即可（GitHub Pages、Cloudflare Pages、自有 Nginx 等）。确保：

- 使用 **HTTP(S)** 访问含 `import` / `fetch` 的页面；  
- `data/tf-preview.pack.json` 与引用它的页面路径关系正确（通常仓库根为站点根）。

---

## 适用与不适用场景

**适用：** 开发/测试、表单与流程验证、教学演示、隐私友好的示例数据生成等。

**不适用：** 真实邮寄、实名开户、规避监管或任何违法用途。

---

## 路线图

见 [ROADMAP.md](./ROADMAP.md)。

---

## License

MIT，见 [LICENSE](LICENSE)。

---

## 支持与联系

如需技术服务或合作，请联系：[jietoushiren01@gmail.com](mailto:jietoushiren01@gmail.com)
