# 部署指南 — VPS（Nginx）

> 适用于任何 Linux VPS（Ubuntu 22.04 / Debian 12 等）。纯静态站点，无需 Node.js、无需构建、无后端进程。部署后约占用 6-10MB 磁盘空间。

## 前置条件

- 一台 Linux VPS（推荐 1 核 1GB 或以上，Ubuntu 22.04）
- 一个已解析到 VPS IP 的域名（可选但强烈建议，因为浏览器 Geolocation API 要求 HTTPS）
- SSH 客户端（Windows 可用 Terminal / PowerShell 自带 ssh）

## 第一步：上传文件到服务器

### 方案 A：使用 rsync（推荐，增量传输）

```bash
# 从本地项目目录上传到服务器
cd F:\github-project\real-random-taxfree-address

rsync -avz --delete \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '*.bak' \
  --exclude 'node_modules' \
  ./ root@你的服务器IP:/var/www/address/
```

> Windows 用户需先安装 rsync（[Git for Windows](https://git-scm.com) 自带的 Git Bash 中包含，或用 WSL）。

### 方案 B：使用 scp（一次性）

```bash
cd F:\github-project\real-random-taxfree-address

# 压缩后传输更省时
tar czf site.tar.gz --exclude='.git' --exclude='.github' .
scp site.tar.gz root@你的服务器IP:~/.
ssh root@你的服务器IP
sudo mkdir -p /var/www/address
sudo tar xzf ~/site.tar.gz -C /var/www/address
rm ~/site.tar.gz
```

### 方案 C：使用 sftp 图形化

使用 WinSCP、FileZilla 等工具，连接到服务器后直接拖拽上传。

## 第二步：安装并配置 Nginx

SSH 到服务器后执行：

```bash
# 安装 Nginx
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

创建站点配置文件：

```bash
sudo nano /etc/nginx/sites-available/address
```

粘贴以下内容（将 `your-domain.com` 替换为你的实际域名，或用 `_` 表示无域名）：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;

    root /var/www/address;
    index index.html;

    # Gzip 压缩（提高加载速度）
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/png image/jpeg;
    gzip_min_length 256;
    gzip_vary on;

    # 缓存策略
    location ~* \.(css|js|json)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(png|jpg|jpeg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ =404;
    }

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/address /etc/nginx/sites-enabled/
sudo nginx -t                     # 测试配置语法
sudo systemctl reload nginx       # 重新加载生效
```

此时 HTTP 站应可访问。打开 `http://你的服务器IP` 验证。

## 第三步：配置 HTTPS（推荐）

### 方案 A：自动申请 Let's Encrypt 证书（certbot）

```bash
sudo certbot --nginx -d your-domain.com
```

按提示输入邮箱并同意条款，certbot 会自动修改 Nginx 配置并开启 HTTPS。

证书有效期为 90 天，certbot 会通过 systemd timer 自动续期。你可以手动测试续期：

```bash
sudo certbot renew --dry-run
```

### 方案 B：使用 acme.sh 自行签发（可选）

```bash
curl https://get.acme.sh | sh
~/.acme.sh/acme.sh --issue -d your-domain.com --nginx
~/.acme.sh/acme.sh --install-cert -d your-domain.com \
  --key-file /etc/nginx/ssl/your-domain.key \
  --fullchain-file /etc/nginx/ssl/your-domain.pem
```

## 第四步：最终 Nginx 配置（HTTPS + HTTP/2）

SSL 证书部署完成后，最终的 Nginx 配置应类似：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    root /var/www/address;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    gzip on;
    gzip_types text/html text/css application/javascript application/json image/png image/jpeg;
    gzip_min_length 256;
    gzip_vary on;

    location ~* \.(css|js|json)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(png|jpg|jpeg|ico)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ =404;
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

## 第五步：防火墙设置

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 部署验证

在浏览器中访问 `https://your-domain.com`，确认：

- 首页（`/`）能正常加载，显示 IP 定位按钮
- 点击「按 IP 找附近住宅地址」能正常请求定位 → 反查 → 展示结果
- 导航栏各子页面（国内地址、香港、美国等）可正常切换
- 各地址页的保存/导出/导入功能可用（localStorage 正常）
- 打开浏览器开发者工具 → Console，确认无 404 或 CORS 错误

## 更新站点

未来更新时，只需重新上传变更的文件：

```bash
# 方法一：rsync 增量同步
cd F:\github-project\real-random-taxfree-address
rsync -avz --delete --exclude='.git' ./ root@你的服务器IP:/var/www/address/

# 方法二：覆盖整个目录
scp -r F:\github-project\real-random-taxfree-address\* root@你的服务器IP:/var/www/address/
```

Nginx 无需重启，文件系统变更即刻生效。

## 可选：使用 Caddy 替代 Nginx（更简单）

Caddy 自动管理 HTTPS，配置文件更简洁。如果你不想折腾 nginx + certbot：

```bash
# 安装 Caddy
sudo apt install -y debian-keyring debian-archive-keyring
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 上传文件到 /var/www/address（步骤同上）

# 创建 Caddyfile
sudo tee /etc/caddy/Caddyfile << 'EOF'
your-domain.com {
    root * /var/www/address
    file_server
    encode gzip

    header {
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
    }
}
EOF

sudo systemctl reload caddy
```

Caddy 会自动申请和续期 Let's Encrypt 证书。

## 注意事项

1. **HTTPS 是必须的**：浏览器定位 API（`navigator.geolocation`）和 ES modules 均要求安全上下文（HTTPS 或 localhost）。无自定义域名时，可先用 `--nginx` 模式为纯 IP 签发自签名证书，或直接用 localhost 测试
2. **`data/` 目录无需特殊权限**：nginx 默认以 www-data 用户运行，需确保有读权限：
   ```bash
   sudo chown -R www-data:www-data /var/www/address
   sudo find /var/www/address -type d -exec chmod 755 {} \;
   sudo find /var/www/address -type f -exec chmod 644 {} \;
   ```
3. **无后端守护进程**：这是一个纯静态站点，部署后不需要像 pm2、Docker、Node.js 等任何进程管理器。配置完 Nginx 即可关闭 SSH
4. **地理编码依赖客户端网络**：Nominatim（OSM）、IP 定位服务均由用户的浏览器直接访问，不经过你的 VPS。VPS 仅提供 HTML/JS/CSS/JSON 文件
5. **临时 HTTP 测试**：如果你只在局域网测试，可以用 Python：
   ```bash
   cd /var/www/address
   python3 -m http.server 8000
   ```
   但 ES modules 需要 `--cors` 参数（`python3 -m http.server 8000 --cors`），且定位 API 在非 HTTPS 下可能不可用