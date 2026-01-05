const SUPPORTED_URLS = [
  /smartstore\.naver\.com\/.*\/products\//,
  /brand\.naver\.com\/.*\/products\//,
  /shopping\.naver\.com\/.*\/products\//,
];

const DEFAULT_SERVER_URL = 'http://localhost:3000';

let currentProductData = null;
let serverUrl = DEFAULT_SERVER_URL;

const elements = {
  notSupported: document.getElementById('not-supported'),
  productInfo: document.getElementById('product-info'),
  analyzing: document.getElementById('analyzing'),
  success: document.getElementById('success'),
  error: document.getElementById('error'),
  productImage: document.getElementById('product-image'),
  productTitle: document.getElementById('product-title'),
  productPrice: document.getElementById('product-price'),
  storeName: document.getElementById('store-name'),
  reviewCount: document.getElementById('review-count'),
  rating: document.getElementById('rating'),
  purchaseCount: document.getElementById('purchase-count'),
  analyzeBtn: document.getElementById('analyze-btn'),
  viewResultBtn: document.getElementById('view-result-btn'),
  retryBtn: document.getElementById('retry-btn'),
  errorMessage: document.getElementById('error-message'),
  serverUrlInput: document.getElementById('server-url'),
  saveSettingsBtn: document.getElementById('save-settings'),
};

const showView = (viewId) => {
  ['notSupported', 'productInfo', 'analyzing', 'success', 'error'].forEach(id => {
    elements[id].classList.add('hidden');
  });
  elements[viewId].classList.remove('hidden');
};

const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 10000) return `${(num / 10000).toFixed(1)}만`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}천`;
  return num.toLocaleString();
};

const formatPrice = (price) => {
  if (!price) return '-';
  return `${price.toLocaleString()}원`;
};

const isSupportedUrl = (url) => {
  return SUPPORTED_URLS.some(pattern => pattern.test(url));
};

const loadSettings = async () => {
  const result = await chrome.storage.sync.get(['serverUrl']);
  serverUrl = result.serverUrl || DEFAULT_SERVER_URL;
  elements.serverUrlInput.value = serverUrl;
};

const saveSettings = async () => {
  serverUrl = elements.serverUrlInput.value.trim() || DEFAULT_SERVER_URL;
  await chrome.storage.sync.set({ serverUrl });
  
  elements.saveSettingsBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  `;
  setTimeout(() => {
    elements.saveSettingsBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 13l4 4L19 7"/>
      </svg>
    `;
  }, 1000);
};

const injectContentScript = async (tabId) => {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content.js']
    });
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['src/content.css']
    });
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (e) {
    console.log('Script already injected or injection failed:', e);
  }
};

const extractDataFromTab = async (tabId) => {
  await injectContentScript(tabId);
  
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: 'extractData' }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error('페이지와 통신할 수 없습니다. 페이지를 새로고침 후 다시 시도해주세요.'));
        return;
      }
      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error('데이터 추출에 실패했습니다.'));
      }
    });
  });
};

const displayProductInfo = (data) => {
  elements.productImage.src = data.product.mainImage || '';
  elements.productTitle.textContent = data.product.title || '상품명 없음';
  elements.productPrice.textContent = formatPrice(data.product.price);
  elements.storeName.textContent = data.product.storeName || '';
  elements.reviewCount.textContent = formatNumber(data.product.reviewCount);
  elements.rating.textContent = data.product.rating || '-';
  elements.purchaseCount.textContent = formatNumber(data.product.purchaseCount);
};

const analyzeProduct = async () => {
  if (!currentProductData) return;

  showView('analyzing');

  try {
    const response = await fetch(`${serverUrl}/api/analyze/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(currentProductData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '서버 오류가 발생했습니다.');
    }

    await chrome.storage.local.set({ 
      lastAnalysisId: result.analysisId,
      lastAnalysisUrl: `${serverUrl}/analysis/${result.analysisId}`,
    });

    showView('success');

  } catch (error) {
    elements.errorMessage.textContent = error.message;
    showView('error');
  }
};

const viewResult = async () => {
  const result = await chrome.storage.local.get(['lastAnalysisUrl']);
  if (result.lastAnalysisUrl) {
    chrome.tabs.create({ url: result.lastAnalysisUrl });
  }
};

const init = async () => {
  await loadSettings();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.url || !isSupportedUrl(tab.url)) {
    showView('notSupported');
    return;
  }

  try {
    const data = await extractDataFromTab(tab.id);
    currentProductData = data;
    displayProductInfo(data);
    showView('productInfo');
  } catch (error) {
    elements.errorMessage.textContent = error.message;
    showView('error');
  }
};

elements.analyzeBtn.addEventListener('click', analyzeProduct);
elements.viewResultBtn.addEventListener('click', viewResult);
elements.retryBtn.addEventListener('click', init);
elements.saveSettingsBtn.addEventListener('click', saveSettings);

init();
