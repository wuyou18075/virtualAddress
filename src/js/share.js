/**
 * Share modal and Chinese share text helpers.
 */
import { copyToClipboard, showToast } from "./utils.js";

export function getChineseShareCountryLabel() {
  const path = window.location.pathname || '';

  if (path.includes('/usa-address') || path.endsWith('/usa.html')) return '美国';
  if (path.includes('/hk-address') || path.endsWith('/hk.html')) return '香港';
  if (path.includes('/uk-address') || path.endsWith('/uk.html')) return '英国';
  if (path.includes('/de-address') || path.endsWith('/de.html')) return '德国';
  if (path.includes('/sg-address') || path.endsWith('/sg.html')) return '新加坡';
  if (path.includes('/jp-address') || path.endsWith('/jp.html')) return '日本';
  if (path.includes('/ca-address') || path.endsWith('/ca.html')) return '加拿大';
  if (path.includes('/in-address') || path.endsWith('/in.html')) return '印度';
  if (path.includes('/tw-address') || path.endsWith('/tw.html')) return '台湾';
  return '美国免税州';
}

export function buildChineseShareText(countryLabel) {
  return `我在用 MockAddress 生成${countryLabel}地址。
免费，不用注册，还能直接在 Google Maps 验证。
👉 你也试试 🥰（点开就能用）`;
}

export function buildChineseSharePayload() {
  const shareUrl = window.location.href.split('#')[0].split('?')[0];
  const countryLabel = getChineseShareCountryLabel();
  const shareText = buildChineseShareText(countryLabel);
  return {
    shareUrl,
    shareText,
    previewText: `${shareText}\n\n${shareUrl}`
  };
}

export function openShareModal(sharePayload) {
  const modal = document.getElementById('share-modal');
  const overlay = document.getElementById('share-modal-overlay');
  const preview = document.getElementById('share-preview');
  const linkInput = document.getElementById('share-link');

  if (!modal || !overlay || !preview || !linkInput) return;
  preview.textContent = sharePayload.previewText;
  linkInput.value = sharePayload.shareUrl;
  modal.classList.add('active');
  overlay.classList.add('active');
}

// Share site handler（“分享”按钮：分享网站本身，而不是具体某条地址）
export function handleShareAddress() {
  const shareBtn = document.getElementById('share-current');
  if (!shareBtn) return;
  
  shareBtn.addEventListener('click', async () => {
    const sharePayload = buildChineseSharePayload();
    const copied = await copyToClipboard(sharePayload.previewText);
    if (copied) {
      showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
    }
    openShareModal(sharePayload);
  });
}

// Close share modal
export function initShareModal() {
  const modal = document.getElementById('share-modal');
  const overlay = document.getElementById('share-modal-overlay');
  const modalContent = modal ? modal.querySelector('.modal-content') : null;
  const closeBtn = document.getElementById('share-modal-close');
  const copyTextBtn = document.getElementById('copy-share-text');
  const copyLinkBtn = document.getElementById('copy-share-link');
  const fbBtn = document.getElementById('share-fb');
  const xBtn = document.getElementById('share-x');
  const tgBtn = document.getElementById('share-tg');
  const waBtn = document.getElementById('share-wa');
  
  function closeModal() {
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
  
  // Close when clicking overlay
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      // Only close if clicking directly on overlay, not on modal content
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
  
  // Prevent modal content clicks from closing the modal
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
  
  // Close when clicking close button
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeModal();
    });
  }
  
  // Close when pressing Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });
  
  if (copyTextBtn) {
    copyTextBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      if (preview) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
    });
  }
  
  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', async () => {
      const linkInput = document.getElementById('share-link');
      if (linkInput) {
        const success = await copyToClipboard(linkInput.value);
        if (success) {
          showToast('链接已复制', 'success');
        }
      }
    });
  }

  // Share to Facebook
  if (fbBtn) {
    fbBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent(url);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to X (Twitter)
  if (xBtn) {
    xBtn.addEventListener('click', () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      // 如果预览里已经包含了链接，则去掉那一部分，避免 X 中出现重复链接
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      const shareUrl = 'https://twitter.com/intent/tweet?text=' +
        encodeURIComponent(text) +
        '&url=' + encodeURIComponent(url);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to Telegram
  if (tgBtn) {
    tgBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://t.me/share/url?url=' +
        encodeURIComponent(url) +
        '&text=' + encodeURIComponent(text);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }

  // Share to WhatsApp
  if (waBtn) {
    waBtn.addEventListener('click', async () => {
      const preview = document.getElementById('share-preview');
      const linkInput = document.getElementById('share-link');
      const url = linkInput && linkInput.value ? linkInput.value : window.location.href.split('#')[0];
      let text = preview ? (preview.textContent || '') : '';
      if (url && text.includes(url)) {
        text = text.replace(url, '').trim();
      }
      if (preview && preview.textContent) {
        const success = await copyToClipboard(preview.textContent);
        if (success) {
          showToast('🙏 文案已复制，帮忙发一下吧～', 'success');
        }
      }
      const shareUrl = 'https://api.whatsapp.com/send?text=' +
        encodeURIComponent(`${text}\n\n${url}`);
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    });
  }
}

// Initialize clear all button
