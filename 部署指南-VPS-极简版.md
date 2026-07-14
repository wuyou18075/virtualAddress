# 部署指南 — VPS（极简版）

> 纯静态站点，不需要 Nginx 配置、不需要 certbot、不需要防火墙规则。上传文件 + 一条命令即可运行。

## 上传文件

从你的开发机上传到 VPS（选一种即可）：

```bash
# 方法 A：rsync（推荐，增量同步）
cd F:\github-project\real-random-taxfree-address
rsync -avz --exclude='.git' ./ root@你的服务器IP:/opt/address/

# 方法 B：scp（一次性的）
tar czf site.tar.gz --exclude='.git' .
scp site.tar.gz root@你的服务器IP:~/
ssh root@你的服务器IP "mkdir -p /opt/address && tar xzf ~/site.tar.gz -C /opt/address && rm ~/site.tar.gz"
```

## 启动

SSH 到服务器，然后：

```bash
cd /opt/address
npx serve -l 80 .
```

现在访问 `http://你的服务器IP` 即可。

## 后台运行

关闭 SSH 后服务不会停：

```bash
# 方法 A：nohup
nohup npx serve -l 80 . > serve.log 2>&1 &

# 方法 B：tmux（推荐，可随时看日志）
tmux new -s address
cd /opt/address
npx serve -l 80 .
# 按 Ctrl+B 再按 D 断开，进程保持后台运行
```

## 更新

```bash
rsync -avz --exclude='.git' ./ root@你的服务器IP:/opt/address/
# 杀掉旧进程重新启动即可
```

## 关于 HTTPS

浏览器定位 API 需要 HTTPS。最快的方式：把域名 DNS 解析到 VPS IP，然后在 Cloudflare 开启 Proxy（橙色云朵）——Cloudflare 会帮你处理 HTTPS，VPS 端保持 HTTP 不变，无需任何额外配置。

即使没有域名，所有不调用定位的功能（手动输入地址转换、按 IP 自动找地址等）在纯 HTTP 下也能正常工作。