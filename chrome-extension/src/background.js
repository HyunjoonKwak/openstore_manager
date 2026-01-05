const DEFAULT_SERVER_URL = 'http://localhost:3000';

const getServerUrl = async () => {
  const result = await chrome.storage.sync.get(['serverUrl']);
  return result.serverUrl || DEFAULT_SERVER_URL;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 }, (dataUrl) => {
      sendResponse({ screenshot: dataUrl });
    });
    return true;
  }

  if (request.action === 'analyzeProduct') {
    handleAnalyzeProduct(request.data, sender.tab)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'captureFullPage') {
    captureFullPage(sender.tab.id)
      .then(screenshot => sendResponse({ success: true, screenshot }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

const handleAnalyzeProduct = async (data, tab) => {
  try {
    const serverUrl = await getServerUrl();

    let screenshot = null;
    try {
      screenshot = await captureVisibleTab();
    } catch (e) {
      console.warn('Screenshot capture failed:', e);
    }

    const payload = {
      ...data,
      screenshot,
      capturedAt: new Date().toISOString(),
    };

    const response = await fetch(`${serverUrl}/api/analyze/extension`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Server error');
    }

    await chrome.storage.local.set({
      lastAnalysisId: result.analysisId,
      lastAnalysisUrl: `${serverUrl}/analysis/${result.analysisId}`,
    });

    if (result.analysisId) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: '분석 완료',
        message: '상품 분석이 완료되었습니다. 클릭하여 결과를 확인하세요.',
      });
    }

    return { success: true, analysisId: result.analysisId };

  } catch (error) {
    console.error('Analysis failed:', error);
    return { success: false, error: error.message };
  }
};

const captureVisibleTab = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(dataUrl);
      }
    });
  });
};

const captureFullPage = async (tabId) => {
  const screenshots = [];
  
  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.scrollTo(0, 0),
  });
  await sleep(500);

  const [{ result: pageInfo }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }),
  });

  const totalScrolls = Math.ceil(pageInfo.scrollHeight / pageInfo.clientHeight);
  
  for (let i = 0; i < Math.min(totalScrolls, 10); i++) {
    const screenshot = await captureVisibleTab();
    screenshots.push(screenshot);

    if (i < totalScrolls - 1) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (scrollAmount) => window.scrollBy(0, scrollAmount),
        args: [pageInfo.clientHeight],
      });
      await sleep(300);
    }
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    func: () => window.scrollTo(0, 0),
  });

  return screenshots;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

chrome.notifications.onClicked.addListener(async (notificationId) => {
  const result = await chrome.storage.local.get(['lastAnalysisUrl']);
  if (result.lastAnalysisUrl) {
    chrome.tabs.create({ url: result.lastAnalysisUrl });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Store Benchmarking Analyzer installed');
});
