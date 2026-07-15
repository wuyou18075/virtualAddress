#!/usr/bin/env bash
# =============================================================================
# VirtualAddress VPS 一键部署脚本
# 用途：在 VPS 上用 Nginx + Let's Encrypt 部署本静态项目
# 用法：sudo bash deploy-vps.sh
# 注意：本项目的 Cloudflare Worker (src/worker.js) 仅在 Cloudflare 上生效，
#       VPS 部署只提供纯静态文件服务，不包含 Worker 逻辑。
# =============================================================================

set -euo pipefail

# ── 颜色 ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[i]${NC} $1"; }

# ── 检查 root ─────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || err "请用 sudo 或 root 运行此脚本"

# ── 检测包管理器 ──────────────────────────────────────────────────────────
if command -v apt &>/dev/null; then
  PKG="apt"; INSTALL="apt install -y"
elif command -v apk &>/dev/null; then
  PKG="apk"; INSTALL="apk add"
elif command -v yum &>/dev/null; then
  PKG="yum"; INSTALL="yum install -y"
elif command -v dnf &>/dev/null; then
  PKG="dnf"; INSTALL="dnf install -y"
else
  err "不支持的包管理器（仅支持 apt/apk/yum/dnf）"
fi
log "检测到包管理器: $PKG"

# ── Nginx / 系统服务 容错封装（兼容 systemd / openrc / 容器） ───────────────
nginx_reload() {
  if command -v systemctl &>/dev/null; then
    systemctl reload nginx 2>/dev/null || systemctl restart nginx 2>/dev/null || true
  elif command -v rc-service &>/dev/null; then
    rc-service nginx reload 2>/dev/null || rc-service nginx restart 2>/dev/null || true
  elif command -v service &>/dev/null; then
    service nginx reload 2>/dev/null || service nginx restart 2>/dev/null || true
  else
    nginx -s reload 2>/dev/null || true
  fi
}

nginx_enable_start() {
  if command -v systemctl &>/dev/null; then
    systemctl enable --now nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
  elif command -v rc-service &>/dev/null; then
    rc-update add nginx default 2>/dev/null || true
    rc-service nginx start 2>/dev/null || true
  elif command -v service &>/dev/null; then
    service nginx start 2>/dev/null || true
  else
    nginx 2>/dev/null || true
  fi
}

# ── 安装 rsync（可能没有） ────────────────────────────────────────────────
if ! command -v rsync &>/dev/null; then
  info "安装 rsync…"
  $INSTALL rsync
fi

# ── 获取脚本所在目录（项目根） ────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. 安装 Nginx ────────────────────────────────────────────────────────
info "检查 Nginx…"
if command -v nginx &>/dev/null; then
  log "Nginx 已安装 ($(nginx -v 2>&1 | grep -oP '[\d.]+'))"
else
  warn "Nginx 未安装，正在安装…"
  $INSTALL nginx
  nginx_enable_start
  log "Nginx 安装完成"
fi

# ── 2. 安装 Certbot（HTTP-01 用） ─────────────────────────────────────────
info "检查 Certbot…"
if command -v certbot &>/dev/null; then
  log "Certbot 已安装"
else
  warn "Certbot 未安装，正在安装…"
  case "$PKG" in
    apt) $INSTALL certbot python3-certbot-nginx ;;
    apk) $INSTALL certbot certbot-nginx ;;
    yum|dnf) $INSTALL certbot python3-certbot-nginx ;;
  esac
  log "Certbot 安装完成"
fi

# ── 3. 输入域名 ──────────────────────────────────────────────────────────
echo ""
read -r -p "请输入你的域名 (例如: va.example.com): " DOMAIN
[[ -z "$DOMAIN" ]] && err "域名不能为空"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN%%/*}"
echo ""

# ── 4. 确认 DNS 已指向本机 ──────────────────────────────────────────────
PUBLIC_IP="$(curl -4 -s ifconfig.me 2>/dev/null || curl -4 -s icanhazip.com 2>/dev/null || echo '')"
if [[ -n "$PUBLIC_IP" ]]; then
  set +e
  DOMAIN_IP="$(dig +short "$DOMAIN" 2>/dev/null | head -1)"
  if [[ -z "$DOMAIN_IP" ]]; then
    DOMAIN_IP="$(getent hosts "$DOMAIN" 2>/dev/null | awk '{print $1}' | head -1)"
  fi
  set -e
  if [[ -n "$DOMAIN_IP" ]]; then
    if [[ "$DOMAIN_IP" != "$PUBLIC_IP" ]]; then
      warn "域名 $DOMAIN 解析到 $DOMAIN_IP，但本机公网 IP 是 $PUBLIC_IP"
      warn "请先在 DNS 管理面板将 $DOMAIN 的 A 记录指向 $PUBLIC_IP，再继续"
      read -r -p "是否继续？(y/N): " confirm
      [[ "$confirm" != "y" && "$confirm" != "Y" ]] && err "已取消部署"
    else
      log "DNS 解析正确: $DOMAIN → $PUBLIC_IP"
    fi
  else
    warn "无法自动检测域名 DNS 解析，请确保 $DOMAIN 已指向本机 IP"
  fi
fi

# ── 5. 部署静态文件 ──────────────────────────────────────────────────────
WEB_ROOT="/var/www/virtualaddress"
info "复制项目文件到 $WEB_ROOT …"
mkdir -p "$WEB_ROOT"
rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='.wrangler' \
  --exclude='node_modules' \
  --exclude='test' \
  --exclude='test-harness.mjs' \
  --exclude='*.md' \
  --exclude='LICENSE' \
  --exclude='package.json' \
  --exclude='package-lock.json' \
  --exclude='wrangler.toml' \
  --exclude='vercel.json' \
  --exclude='.vercelignore' \
  --exclude='.gitignore' \
  --exclude='.assetsignore' \
  --exclude='src/worker.js' \
  "$SCRIPT_DIR/" "$WEB_ROOT/"
log "文件已部署到 $WEB_ROOT"

# 设置权限
chown -R www-data:www-data "$WEB_ROOT" 2>/dev/null || chown -R nginx:nginx "$WEB_ROOT" 2>/dev/null || true
find "$WEB_ROOT" -type d -exec chmod 755 {} \;
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# ── 6. 生成 HTTP Nginx 配置 ──────────────────────────────────────────────
NGINX_CONF="/etc/nginx/sites-available/virtualaddress"

info "生成 Nginx 配置…"

cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    root $WEB_ROOT;
    index index.html;

    # 安全头
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    # 静态资源缓存 (1 天)
    location ~ ^/(data|src)/ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Content-Type-Options "nosniff" always;
    }

    # 旧路径 301 → 新扁平入口
    location ~ ^/(usa-address|cn-address|hk-address|uk-address|ca-address|jp-address|tw-address|de-address|sg-address|mac-address)(/.*)?$ {
        return 301 /address/\$1.html;
    }
    location ~ ^/taxfree(/.*)?$ {
        return 301 /address/taxfree.html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
NGINXEOF

# 启用站点（兼容 sites-enabled 与 conf.d 两种布局）
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/virtualaddress 2>/dev/null || true
ln -sf "$NGINX_CONF" /etc/nginx/conf.d/virtualaddress.conf 2>/dev/null || true
# 删除默认站点（避免冲突）
[[ -f /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default

# 测试配置
nginx -t || err "Nginx 配置测试失败，请检查 $NGINX_CONF"
nginx_reload
log "Nginx 配置已生效 (HTTP)"

# ── 7. 检查外网 80 端口可达性 ──────────────────────────────────────────────
info "检测外网 80 端口是否可达…"
PORT80_OK=false
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$DOMAIN/" 2>/dev/null || true)
if [[ "$HTTP_CODE" =~ ^[23] ]]; then
  log "外网 80 端口可达 (HTTP $HTTP_CODE)"
  PORT80_OK=true
elif [[ "$HTTP_CODE" == "000" ]]; then
  warn "http://$DOMAIN/ 连接失败（外网 80 端口可能不通）"
else
  log "外网 80 端口检查结果: HTTP $HTTP_CODE"
  PORT80_OK=true
fi

# ── 8. 申请 SSL 证书 ──────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  SSL 证书申请：$DOMAIN"
echo "=============================================="
echo ""

CRON_HOOK=""

if [[ "$PORT80_OK" == "true" ]]; then
  # ── 8a. HTTP-01 验证（标准端口 80 可达） ──────────────────────────────
  info "使用 HTTP-01 验证（端口 80 通）"
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect 2>&1 || {
    warn "自动申请失败，尝试交互模式…"
    certbot --nginx -d "$DOMAIN" --redirect
  }
  CRON_HOOK="nginx_reload"
else
  # ── 8b. 端口 80 不通 → DNS-01 验证 ──────────────────────────────────
  warn "外网 80 端口不通，Let's Encrypt HTTP-01 验证无法使用"
  echo ""
  echo " 请选择证书方案："
  echo ""
  echo "  1) Cloudflare DNS API — 通过 DNS TXT 记录验证（推荐，需 CF API Token）"
  echo "  2) 手动 DNS 验证 — certbot 给出 TXT 值，你手动去 DNS 加记录"
  echo "  3) 自签名证书 — 仅用于测试/内网，浏览器会显示不安全"
  echo "  4) 跳过证书 — 只配 HTTP"
  echo ""
  read -r -p "请选择 [1/2/3/4] (默认 1): " CERT_CHOICE
  CERT_CHOICE="${CERT_CHOICE:-1}"

  case "$CERT_CHOICE" in
    1)
      info "安装 certbot-dns-cloudflare 插件…"
      case "$PKG" in
        apt) $INSTALL python3-certbot-dns-cloudflare ;;
        apk) $INSTALL certbot-dns-cloudflare ;;
        yum|dnf) $INSTALL python3-certbot-dns-cloudflare ;;
      esac

      echo ""
      warn "请准备一个 Cloudflare API Token（域名需在 CF 上管理）"
      echo "  创建地址: https://dash.cloudflare.com/profile/api-tokens"
      echo "  权限: Zone:DNS:Edit"
      echo "  资源: 包含域名 $DOMAIN"
      echo ""

      CF_CRED_DIR="/etc/letsencrypt"
      CF_CRED_FILE="$CF_CRED_DIR/cloudflare.ini"
      mkdir -p "$CF_CRED_DIR"

      read -r -p "输入 Cloudflare API Token: " CF_TOKEN
      while [[ -z "$CF_TOKEN" ]]; do
        warn "Token 不能为空"
        read -r -p "输入 Cloudflare API Token: " CF_TOKEN
      done

      cat > "$CF_CRED_FILE" <<EOF
dns_cloudflare_api_token = $CF_TOKEN
EOF
      chmod 600 "$CF_CRED_FILE"

      certbot certonly --dns-cloudflare --dns-cloudflare-credentials "$CF_CRED_FILE" \
        -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" 2>&1 || {
        warn "DNS-01 自动申请失败，尝试交互模式…"
        certbot certonly --dns-cloudflare --dns-cloudflare-credentials "$CF_CRED_FILE" \
          -d "$DOMAIN" --agree-tos --email "admin@$DOMAIN"
      }

      # 生成 HTTPS Nginx 配置
      info "生成 HTTPS Nginx 配置…"
      cat >> "$NGINX_CONF" <<HTTPSEOF

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root $WEB_ROOT;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location ~ ^/(data|src)/ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location ~ ^/(usa-address|cn-address|hk-address|uk-address|ca-address|jp-address|tw-address|de-address|sg-address|mac-address)(/.*)?$ {
        return 301 /address/\$1.html;
    }
    location ~ ^/taxfree(/.*)?$ {
        return 301 /address/taxfree.html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
HTTPSEOF
      nginx -t || err "Nginx 配置测试失败"
      nginx_reload
      CRON_HOOK="nginx_reload"
      ;;
    2)
      echo ""
      warn "手动 DNS 验证模式"
      echo "  certbot 会生成一段 TXT 记录值，你需要去 DNS 管理面板加记录"
      echo "  添加后再回终端按回车继续"
      echo ""
      read -r -p "按回车开始手动验证…"

      certbot certonly --manual --preferred-challenges dns \
        -d "$DOMAIN" --agree-tos --email "admin@$DOMAIN"

      cat >> "$NGINX_CONF" <<HTTPSEOF

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root $WEB_ROOT;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location ~ ^/(data|src)/ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location ~ ^/(usa-address|cn-address|hk-address|uk-address|ca-address|jp-address|tw-address|de-address|sg-address|mac-address)(/.*)?$ {
        return 301 /address/\$1.html;
    }
    location ~ ^/taxfree(/.*)?$ {
        return 301 /address/taxfree.html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}

server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}
HTTPSEOF
      nginx -t || err "Nginx 配置测试失败"
      nginx_reload
      CRON_HOOK="nginx_reload"
      ;;
    3)
      warn "生成自签名证书（仅内网/测试用）"
      mkdir -p /etc/nginx/ssl
      openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/virtualaddress.key \
        -out /etc/nginx/ssl/virtualaddress.crt \
        -subj "/CN=$DOMAIN"

      cat > "$NGINX_CONF" <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root $WEB_ROOT;
    index index.html;

    ssl_certificate /etc/nginx/ssl/virtualaddress.crt;
    ssl_certificate_key /etc/nginx/ssl/virtualaddress.key;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location ~ ^/(data|src)/ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Content-Type-Options "nosniff" always;
    }

    location ~ ^/(usa-address|cn-address|hk-address|uk-address|ca-address|jp-address|tw-address|de-address|sg-address|mac-address)(/.*)?$ {
        return 301 /address/\$1.html;
    }
    location ~ ^/taxfree(/.*)?$ {
        return 301 /address/taxfree.html;
    }

    location / {
        try_files \$uri \$uri/ =404;
    }
}
NGINXEOF
      nginx -t || err "Nginx 配置测试失败"
      nginx_reload
      CRON_HOOK=""
      warn "自签名证书不会自动续期，有效期 365 天"
      ;;
    4|*)
      warn "跳过证书，仅 HTTP"
      CRON_HOOK=""
      ;;
  esac
fi

log "SSL 证书处理完成"

# ── 9. 设置证书自动续期（仅 Let's Encrypt） ──────────────────────────────
if [[ -n "${CRON_HOOK:-}" ]]; then
  # 续期 hook 在独立 cron 环境里重新 source 本脚本不方便，直接写健壮的重载命令
  RENEW_HOOK='(command -v systemctl >/dev/null && systemctl reload nginx) || (command -v rc-service >/dev/null && rc-service nginx reload) || (command -v service >/dev/null && service nginx reload) || nginx -s reload || true'
  CRON_JOB="0 3 * * * /usr/bin/certbot renew --quiet --post-hook '$RENEW_HOOK'"
  if crontab -l 2>/dev/null | grep -q 'certbot renew'; then
    log "Certbot 续期 cron 已存在"
  else
    (crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -
    log "已添加 certbot 自动续期 cron (每天 3:00)"
  fi
fi

# ── 10. 完成 ─────────────────