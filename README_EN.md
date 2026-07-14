# MockAddress Core 

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-Pure%20JavaScript-blue)]()
[![Backend](https://img.shields.io/badge/Backend-None-lightgrey)]()
[![Privacy](https://img.shields.io/badge/Privacy-First-brightgreen)]()

> This repository is the **open-source frontend core** of MockAddress: address-related test data generation for many countries/regions, MAC utilities, base styles, and more.  
> Full product: <https://mockaddress.com/en/>  
> **中文文档:** [README_CN.md](./README_CN.md)

---

## What’s in This Repo

| Part | Description |
|------|-------------|
| **`src/`** | Engine you can embed (`address-generator.js`, `mac-generator.js`, `utils.js`, `config.js`, etc.) plus **`src/css/main.css`**. |
| **`data/tf-preview.pack.json`** | Shipped **demo** sample of US tax-free-state-style rows (**AK, DE, MT, OR only**); neutral filename; **not** the production full database. |
| **Root `index.html` + `test-harness.mjs`** | Local HTTP harness to exercise `src` with a **card-style result UI** similar to the main site. |
| **`启动测试.bat`** | Windows helper to start a static server from the repo root and open the browser. |

**Not included:** production HTML templates, internal ops scripts, or full **production data assets** (their filenames and layout are not documented in this repo). Only the **`.pack.json`** demo file above is published here.

---

## How the engine resolves JSON paths

Paths are **not** hard-coded to any production layout. They come from **`dataFiles`** in `src/js/config.js`, overridable via **`configure({ dataFiles: { … } })`**. Defaults are **neutral** filenames for this OSS repo; **you may point each key to any URL/path you control** (including names never published here).

| `dataFiles` key | Default relative path |
|-----------------|------------------------|
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
| `taxfreePreviewPack` | `data/tf-preview.pack.json` (demo sample in this repo) |
| `macOui` | `data/oui-registry.json` |

Private deploy example:

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

**JSON schema** must still match what the engine expects; only **paths/filenames** are yours. This README does **not** document any production server directory layout.

---

## Repository Layout (excerpt)

```
KY/
├── src/
│   ├── js/
│   │   ├── address-generator.js
│   │   ├── taxfree-preview-pack.js   # reads tf-preview.pack.json, random row
│   │   ├── mac-generator.js
│   │   ├── storage.js
│   │   ├── language-switcher.js
│   │   ├── utils.js
│   │   └── config.js
│   └── css/
│       └── main.css
├── data/
│   └── tf-preview.pack.json          # demo sample (four states)
├── index.html                        # local test entry
├── test-harness.mjs
├── 启动测试.bat                      # Windows static server helper
├── LICENSE
├── CONTRIBUTING.md
├── ROADMAP.md
├── README_CN.md
└── README_EN.md
```

---

## Run Locally (Test `src`)

1. Clone or copy the **`KY`** folder.
2. **Windows:** double-click **`启动测试.bat`** (starts a server at the repo root and opens the browser).
3. Open **`http://localhost:8000/`** (uses root `index.html`).
4. Do **not** use `file://` for pages that `fetch('data/...')` and ES modules.

Requires **Python 3** (or PHP / Node `npx` as fallbacks in the batch file). No build step or database.

---

## Using `src` in Your Project

### Configure directory + per-file overrides

```html
<script type="module">
  import { configure } from './src/js/config.js';
  import { generateUSAddress } from './src/js/address-generator.js';

  configure({
    dataBasePath: 'my-data/',
    autoDetectPaths: false,
    // optional: dataFiles: { usRegions: 'my-data/x.json', names: 'my-data/y.json' }
  });

  const address = await generateUSAddress('CA');
  console.log(address);
</script>
```

### Tax-free **sample rows** (same file as `tf-preview.pack.json`)

```javascript
import {
  pickRandomTaxFreePreviewRow,
  addressFromTaxFreePreviewRow
} from './src/js/taxfree-preview-pack.js';

const row = await pickRandomTaxFreePreviewRow('DE');
const addr = await addressFromTaxFreePreviewRow(row, 'Delaware');
// With phone: same as generateUSAddress — random pick from usRegions.states.DE.area_codes, then generatePhoneNumber; falls back if usRegions missing
```

### About `generateTaxFreeAddress`

`generateTaxFreeAddress()` delegates to **`generateUSAddress()`** and follows the engine’s **synthetic** address path: you must provide a **full set** of data files under your own `data/` (or a path set via `configure`). **This README does not name those files or describe production storage layouts.** That path is **not** the same as random rows from **`tf-preview.pack.json`**. For pack-aligned samples, use **`taxfree-preview-pack.js`**.

### Other generators

HK, UK, CA, JP, IN, TW, SG, DE helpers plus `generateIdentityInfo`, `generateCreditCardInfo`, MAC APIs, etc. live under `src/js/`. Full behavior requires JSON datasets you supply that match what `loadData` expects (this repo does not ship full production data).

---

For contribution and roadmap, see [CONTRIBUTING.md](./CONTRIBUTING.md) and [ROADMAP.md](./ROADMAP.md).

---

## Deployment (Static Hosting)

Host the repo as a **static site** (GitHub Pages, Cloudflare Pages, Nginx, etc.). Ensure:

- Pages using `import` / `fetch` are loaded over **HTTP(S)**.
- `data/tf-preview.pack.json` is reachable at the path your code expects (usually site root = repo root).

---

## Suitable vs Unsuitable Uses

**Suitable:** development/testing, form validation, education, privacy-friendly sample data.

**Unsuitable:** real mailing, real-name registration, evading regulation, or any illegal use.

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md).

---

## License

MIT — see [LICENSE](LICENSE).

---

## Support

Technical services / collaboration: [jietoushiren01@gmail.com](mailto:jietoushiren01@gmail.com)
