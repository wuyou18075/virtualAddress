---
name: virtualaddress_change
description: VirtualAddress 变更记录
---

# VirtualAddress 变更记录

## 2026-07-15 — Cloudflare Dashboard 部署识别标准化
- 新增 `package.json` / `package-lock.json`，固定 Wrangler 4.110.0
- 增加 test、check、deploy、deploy:dry-run 标准脚本
- 新增 `.assetsignore`，避免公开仓库元数据、测试、文档及部署配置
- 新增 `.gitignore`，排除依赖、Wrangler 状态和本地密钥
- 干净目录验证：npm ci、7/7 单测、语法检查、Wrangler dry-run 均通过

## 2026-07-15 — data-loader 并发合并与索引优化 + main.js 保存列表统一
- `src/js/data-loader.js`：
  - 新增 `pendingLoads` Map，避免并发 loadData 时重复网络请求
  - `SHARD_META` 增加 `needsIndex` 标记；仅 jp-real 分片需要 index.json
- `src/js/main.js`：
  - 提取 `refreshSavedAddressesUI()` 统一保存/删除/清空/导入后的列表刷新
  - 保存列表删除改为容器事件委托（`bindSavedAddressesDelegation`），单次绑定避免重复监听
- 建立项目根目录 outline.md / nodeTree.md / change.md 索引文件
- 单测 7/7 通过