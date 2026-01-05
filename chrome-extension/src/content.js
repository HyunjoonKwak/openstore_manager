(() => {
  const extractProductData = () => {
    const data = {
      url: window.location.href,
      platform: 'naver_smart_store',
      extractedAt: new Date().toISOString(),
      product: {},
      page: {},
    };

    try {
      data.product.title = document.querySelector('h3._22kNQuEXmb, ._3oDjKvSuMi, .prd_name')?.textContent?.trim() ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';

      const priceEl = document.querySelector('._1LY7DqCnwR, .prd_price strong, ._2pgHN-ntx6');
      if (priceEl) {
        const priceText = priceEl.textContent?.replace(/[^0-9]/g, '');
        data.product.price = priceText ? parseInt(priceText, 10) : null;
      }

      const originalPriceEl = document.querySelector('._2id8yXpK_k del, .original_price');
      if (originalPriceEl) {
        const originalPriceText = originalPriceEl.textContent?.replace(/[^0-9]/g, '');
        data.product.originalPrice = originalPriceText ? parseInt(originalPriceText, 10) : null;
      }

      const discountEl = document.querySelector('._1XIJCnS1El, .discount_rate');
      data.product.discountRate = discountEl?.textContent?.trim() || null;

      data.product.mainImage = document.querySelector('._3kdefF2r8y img, .prd_image img, meta[property="og:image"]')?.src ||
        document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      const additionalImages = [];
      document.querySelectorAll('._2T-_gniYhK img, .thumb_area img').forEach(img => {
        if (img.src && !img.src.includes('data:image')) {
          additionalImages.push(img.src);
        }
      });
      data.product.additionalImages = additionalImages.slice(0, 10);

      data.product.storeName = document.querySelector('._3vAcuHWzbc, .store_name, ._1b4Iosj1hL')?.textContent?.trim() || '';

      const reviewCountEl = document.querySelector('._1fSh8N-_y- .count, .review_count, ._2pgHN-ntx6');
      const reviewText = reviewCountEl?.textContent?.match(/[\d,]+/)?.[0];
      data.product.reviewCount = reviewText ? parseInt(reviewText.replace(/,/g, ''), 10) : 0;

      const ratingEl = document.querySelector('._14FigHP3E0, .star_score, ._2RXCi8Flid');
      data.product.rating = ratingEl?.textContent?.trim() || null;

      const purchaseCountEl = document.querySelector('._3HJHJjSrNK, .purchase_count');
      const purchaseText = purchaseCountEl?.textContent?.match(/[\d,]+/)?.[0];
      data.product.purchaseCount = purchaseText ? parseInt(purchaseText.replace(/,/g, ''), 10) : 0;

      data.product.description = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';

      const categories = [];
      document.querySelectorAll('._1yYLKWynhT a, .category_path a').forEach(el => {
        const text = el.textContent?.trim();
        if (text) categories.push(text);
      });
      data.product.categories = categories;

      const options = [];
      document.querySelectorAll('._2z5i9gIQQQ, .option_item, ._3cToqURcmK select option').forEach(el => {
        const text = el.textContent?.trim();
        if (text && text !== '선택하세요' && text !== '옵션 선택') {
          options.push(text);
        }
      });
      data.product.options = options;

      const deliveryEl = document.querySelector('._2OQOP2Xzyl, .delivery_info, ._3_k09FqFRG');
      data.product.deliveryInfo = deliveryEl?.textContent?.trim() || '';

      data.page.title = document.title;
      data.page.metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      data.page.metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
      data.page.ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      const detailContent = document.querySelector('._1RqiVofpbT, .detail_content, #INTRODUCE');
      if (detailContent) {
        const detailImages = [];
        detailContent.querySelectorAll('img').forEach(img => {
          const src = img.src || img.dataset.src;
          if (src && !src.includes('data:image')) {
            detailImages.push(src);
          }
        });
        data.page.detailImages = detailImages.slice(0, 30);

        const textContent = detailContent.textContent?.replace(/\s+/g, ' ').trim() || '';
        data.page.detailText = textContent.slice(0, 10000);
      }

      const colorInfo = extractColorInfo();
      data.page.colors = colorInfo;

      data.page.htmlSnapshot = document.documentElement.outerHTML.slice(0, 100000);

    } catch (error) {
      console.error('[Store Analyzer] Error extracting data:', error);
      data.error = error.message;
    }

    return data;
  };

  const extractColorInfo = () => {
    const colors = new Map();
    
    const styleSheets = document.styleSheets;
    try {
      for (const sheet of styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (const rule of rules) {
            if (rule.style) {
              ['backgroundColor', 'color', 'borderColor'].forEach(prop => {
                const value = rule.style[prop];
                if (value && value !== 'transparent' && value !== 'inherit') {
                  colors.set(value, (colors.get(value) || 0) + 1);
                }
              });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    const hexPattern = /#[0-9A-Fa-f]{3,6}/g;
    const rgbPattern = /rgb\(\d+,\s*\d+,\s*\d+\)/g;
    
    const html = document.documentElement.outerHTML;
    const hexColors = html.match(hexPattern) || [];
    const rgbColors = html.match(rgbPattern) || [];
    
    [...hexColors, ...rgbColors].forEach(color => {
      colors.set(color, (colors.get(color) || 0) + 1);
    });

    return Array.from(colors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([color, count]) => ({ color, count }));
  };

  const captureScreenshot = async () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'captureScreenshot' }, (response) => {
        resolve(response?.screenshot || null);
      });
    });
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      const data = extractProductData();
      sendResponse({ success: true, data });
    } else if (request.action === 'ping') {
      sendResponse({ success: true, ready: true });
    }
    return true;
  });

  const injectFloatingButton = () => {
    if (document.getElementById('store-analyzer-btn')) return;

    const button = document.createElement('div');
    button.id = 'store-analyzer-btn';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    `;
    button.title = '이 상품 분석하기';
    
    button.addEventListener('click', async () => {
      button.classList.add('loading');
      const data = extractProductData();
      
      chrome.runtime.sendMessage({
        action: 'analyzeProduct',
        data: data
      }, (response) => {
        button.classList.remove('loading');
        if (response?.success) {
          showNotification('분석 요청이 전송되었습니다!', 'success');
        } else {
          showNotification(response?.error || '분석 요청 실패', 'error');
        }
      });
    });

    document.body.appendChild(button);
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `store-analyzer-notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFloatingButton);
  } else {
    injectFloatingButton();
  }

  console.log('[Store Analyzer] Content script loaded');
})();
