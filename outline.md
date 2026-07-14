---
name: virtualaddress_outline
description: VirtualAddress 系统功能抽象（做什么）——多国地址/身份/卡号/OSM 地理/MAC 生成工具
---

# VirtualAddress 系统功能抽象

## 核心功能
- 多国家 / 地区地址生成：US、UK、CA、JP、HK、TW、DE、SG、Mac
- 美国免税州地址（5 州独立分片）
- 身份信息生成：姓名、性别、电话、邮箱、生日、职业、证件号
- 测试信用卡生成（Luhn-valid，不含真实卡号）
- MAC 地址生成与 OUI 厂商查询
- 首页 / 国内页：IP 附近住宅检索、中文地址翻译为英文（OSM Nominatim / Geoapify）
- 地址保存与导入导出（CSV / JSON），频率限制
- 分享（URL 压缩）与复制
- 301 兼容（旧页路径到新扁平入口）

## 架构特征
- 纯前端静态资源 + Cloudflare Worker，无构建步骤
- 扁平 `address/*.html` 入口，同构外壳（shell.js）
- 按国家 Generator 模块 + 共享 data-loader（路径探测、localStorage 缓存、分片池加载）
- 真实地址分片：`data/us-real/`、`us-taxfree/`、`jp-real/`、`in-pin/`
- Node 单测（`test/unit.mjs`）
- CI（GitHub Actions）：先 test 后 deploy（Wrangler）