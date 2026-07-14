---
name: virtualaddress_nodetree
description: VirtualAddress 文件索引与职责
---

# VirtualAddress nodeTree 文件索引

## 入口
- `index.html`：首页 / 中文页
- `address/{country}.html`：各国家扁平入口（usa, uk, ca, jp, hk, tw, de, sg, mac, taxfree）

## 数据
- `data/{country}Data.json`：各国基础合成数据
- `data/us-real/{STATE}.json` + `index.json`：US 真实地址分片
- `data/us-taxfree/{STATE}.json` + `index.json`：US 免税地址分片
- `data/jp-real/{都道府県}.json` + `index.json`：日本真实地址分片
- `data/in-pin/{STATE}.json` + `index.json`：印度 PIN 分片
- `data/macOuiData.json`：MAC OUI 数据（~52KB）
- `data/names-pool.json`：英文姓名池

## 源码
- `src/js/main.js`：页面装配、保存列表、导入导出、频率控制、初始化入口（`initPage`）
- `src/js/display-address.js`：地址卡渲染（包括中文布局）
- `src/js/data-loader.js`：共享数据加载、分片索引、并发请求合并、localStorage 缓存
- `src/js/shell.js`：公共导航外壳（mountShell）
- `src/js/config.js`：数据路径配置
- `src/js/selectors.js`：国家/地区下拉选项初始化
- `src/js/storage.js`：localStorage 持久化、导入导出、频率限制
- `src/js/share.js`：分享压缩与模态框
- `src/js/api-settings.js`：API Key 设置入口
- `src/js/geo-page.js`：首页/国内页地理查询
- `src/js/geo-save.js`：地理地址保存
- `src/js/geo-verify.js`：地址验证 / API Key 存储
- `src/js/mac-generator.js`：MAC 生成 / OUI 查询
- `src/js/utils.js`：公共工具（HTML 转义、随机、格式、Toast）
- `src/js/taxfree-preview-pack.js`：免税预览包

## 生成器
- `src/js/generators/us.js`：美国地址生成
- `src/js/generators/uk.js`：英国地址生成
- `src/js/generators/ca.js`：加拿大地址生成
- `src/js/generators/jp.js`：日本地址生成
- `src/js/generators/de.js`：德国地址生成
- `src/js/generators/hk.js`：香港地址生成
- `src/js/generators/tw.js`：台湾地址生成
- `src/js/generators/sg.js`：新加坡地址生成
- `src/js/generators/in.js`：印度地址生成
- `src/js/generators/identity.js`：身份信息 / 信用卡生成

## Worker
- `src/worker.js`：Cloudflare Worker（301, 安全头, 缓存头）
- `wrangler.toml`：CF Workers + Assets 配置

## 测试与 CI
- `package.json` / `package-lock.json`：固定 Wrangler 版本及 test/check/deploy 脚本，供本地与 Cloudflare Builds 使用
- `.assetsignore`：排除仓库元数据、测试、文档和部署配置，不作为公开静态资源上传
- `.gitignore`：排除依赖、Wrangler 状态和本地密钥文件
- `test/unit.mjs`：Node 单测（Node --test）
- `.github/workflows/deploy.yml`：test → deploy（main 分支 push）