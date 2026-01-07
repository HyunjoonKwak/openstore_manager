import { chromium, type Browser, type BrowserContext } from 'playwright-core'
import * as cheerio from 'cheerio'

export interface ScrapedContent {
  url: string
  platform: string
  title: string | null
  description: string | null
  images: string[]
  bodyText: string
  rawHtml: string
  meta: {
    keywords: string[]
    ogImage: string | null
    ogTitle: string | null
    ogDescription: string | null
  }
}

export interface ScrapeResult {
  success: boolean
  content?: ScrapedContent
  error?: string
  isBlocked?: boolean
  method?: 'playwright' | 'cheerio'
}

const NAVER_SMARTSTORE_PATTERNS = [
  /^https?:\/\/smartstore\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/m\.smartstore\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/brand\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/shopping\.naver\.com\/.*\/products\/\d+/,
]

const LOCAL_CHROME_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

function cleanUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return `${urlObj.origin}${urlObj.pathname}`
  } catch {
    return url
  }
}

function detectPlatform(url: string): string {
  for (const pattern of NAVER_SMARTSTORE_PATTERNS) {
    if (pattern.test(url)) {
      return 'naver_smart_store'
    }
  }
  return 'unknown'
}

function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

async function findChromePath(): Promise<string | undefined> {
  const fs = await import('fs')
  for (const path of LOCAL_CHROME_PATHS) {
    if (fs.existsSync(path)) {
      return path
    }
  }
  return undefined
}

function isBlockedPage(title: string | null, bodyText: string, rawHtml?: string): boolean {
  const blockedIndicators = [
    '에러페이지',
    '시스템오류',
    '접속이 불가',
    'captcha',
    'robot',
    '비정상적인 접근',
    '잠시 후 다시',
    '보안 확인을 완료해 주세요',
    '캡차이미지',
    '정답을 입력해주세요',
  ]
  
  const lowerTitle = (title || '').toLowerCase()
  const lowerBody = bodyText.toLowerCase()
  const lowerHtml = (rawHtml || '').toLowerCase()
  
  return blockedIndicators.some(indicator => {
    const lowerIndicator = indicator.toLowerCase()
    return lowerTitle.includes(lowerIndicator) || 
           lowerBody.includes(lowerIndicator) ||
           lowerHtml.includes(lowerIndicator)
  })
}

export async function scrapeWithCheerio(url: string): Promise<ScrapeResult> {
  const cleanedUrl = cleanUrl(url)
  
  try {
    const response = await fetch(cleanedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        method: 'cheerio',
      }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    $('script, style, noscript, iframe').remove()

    const title = $('title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('h1').first().text().trim() || 
                  null

    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       null

    const images: string[] = []
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src')
      if (src && !src.includes('data:image') && src.startsWith('http')) {
        images.push(src)
      }
    })

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 10000)
    const rawHtml = $.html().slice(0, 50000)

    const keywordsStr = $('meta[name="keywords"]').attr('content') || ''
    const keywords = keywordsStr.split(',').map(k => k.trim()).filter(Boolean)

    const ogImage = $('meta[property="og:image"]').attr('content') || null
    const ogTitle = $('meta[property="og:title"]').attr('content') || null
    const ogDescription = $('meta[property="og:description"]').attr('content') || null

    const platform = detectPlatform(cleanedUrl)

    if (isBlockedPage(title, bodyText, rawHtml)) {
      return {
        success: false,
        isBlocked: true,
        error: '네이버에서 접근을 차단했습니다. 네이버 스마트스토어는 자동화된 접근을 제한하고 있습니다. 잠시 후 다시 시도해주세요.',
        method: 'cheerio',
      }
    }

    return {
      success: true,
      content: {
        url: cleanedUrl,
        platform,
        title,
        description,
        images: images.slice(0, 20),
        bodyText,
        rawHtml,
        meta: {
          keywords,
          ogImage,
          ogTitle,
          ogDescription,
        },
      },
      method: 'cheerio',
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      method: 'cheerio',
    }
  }
}

async function getUserDataDir(): Promise<string> {
  const os = await import('os')
  const path = await import('path')
  const platform = os.platform()
  
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome')
  } else if (platform === 'win32') {
    return path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data')
  } else {
    return path.join(os.homedir(), '.config', 'google-chrome')
  }
}

export async function scrapeWithPlaywright(url: string): Promise<ScrapeResult> {
  const cleanedUrl = cleanUrl(url)
  let browser: Browser | null = null
  let context: BrowserContext | null = null

  try {
    const executablePath = await findChromePath()
    
    if (!executablePath) {
      return {
        success: false,
        error: 'Chrome browser not found. Please install Chrome.',
      }
    }

    const userDataDir = await getUserDataDir()
    const fs = await import('fs')
    const _useUserProfile = fs.existsSync(userDataDir)

    browser = await chromium.launch({
      executablePath,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-networking',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1440,900',
        '--start-maximized',
      ],
    })

    const chromeVersion = '131.0.0.0'
    const randomWidth = 1440 + Math.floor(Math.random() * 160)
    const randomHeight = 900 + Math.floor(Math.random() * 80)

    context = await browser.newContext({
      viewport: { width: randomWidth, height: randomHeight },
      screen: { width: 1920, height: 1080 },
      userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      geolocation: { latitude: 37.5665, longitude: 126.9780 },
      permissions: ['geolocation'],
      colorScheme: 'light',
      deviceScaleFactor: 2,
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Sec-Ch-Ua': `"Google Chrome";v="${chromeVersion.split('.')[0]}", "Chromium";v="${chromeVersion.split('.')[0]}", "Not_A Brand";v="24"`,
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    const page = await context.newPage()

    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false })
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
            { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
          ]
          const pluginArray = Object.create(PluginArray.prototype)
          plugins.forEach((p, i) => { pluginArray[i] = p })
          pluginArray.length = plugins.length
          return pluginArray
        }
      })
      
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] })
      Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' })
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
      
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 })
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 })

      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: PermissionDescriptor) => (
        parameters.name === 'notifications'
          ? Promise.resolve({ state: 'default' as PermissionState, name: parameters.name, onchange: null } as PermissionStatus)
          : originalQuery.call(navigator.permissions, parameters)
      )

      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
        if (parameter === 37445) return 'Intel Inc.'
        if (parameter === 37446) return 'Intel Iris OpenGL Engine'
        return getParameter.call(this, parameter)
      }

    })

    await randomDelay(1000, 2000)

    const referers = [
      'https://search.naver.com/search.naver?query=',
      'https://www.google.com/search?q=',
    ]
    const referer = referers[Math.floor(Math.random() * referers.length)]
    
    await page.goto(cleanedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      referer: referer,
    })

    await page.waitForSelector('body', { timeout: 10000 })
    await randomDelay(1500, 3000)

    const moveCount = 3 + Math.floor(Math.random() * 3)
    for (let i = 0; i < moveCount; i++) {
      await page.mouse.move(
        100 + Math.random() * 300,
        100 + Math.random() * 300,
        { steps: 10 + Math.floor(Math.random() * 10) }
      )
      await randomDelay(100, 300)
    }

    const scrollSteps = 3 + Math.floor(Math.random() * 2)
    for (let i = 0; i < scrollSteps; i++) {
      await page.evaluate((step) => {
        window.scrollTo({ top: 200 * step, behavior: 'smooth' })
      }, i)
      await randomDelay(500, 1000)
    }
    
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    await randomDelay(1000, 2000)
    
    await page.evaluate(() => window.scrollTo(0, 0))
    await randomDelay(1000, 2000)

    const content = await page.evaluate(() => {
      document.querySelectorAll('script, style, noscript, iframe').forEach(el => el.remove())

      const title = document.title ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('h1')?.textContent?.trim() ||
        null

      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
        document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        null

      const images: string[] = []
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.dataset.src
        if (src && !src.includes('data:image') && src.startsWith('http')) {
          images.push(src)
        }
      })

      const bodyText = document.body?.textContent?.replace(/\s+/g, ' ').trim() || ''

      const keywordsStr = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || ''
      const keywords = keywordsStr.split(',').map(k => k.trim()).filter(Boolean)

      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null
      const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null

      return {
        title,
        description,
        images: images.slice(0, 20),
        bodyText: bodyText.slice(0, 10000),
        rawHtml: document.documentElement.outerHTML.slice(0, 50000),
        keywords,
        ogImage,
        ogTitle,
        ogDescription,
      }
    })

    const platform = detectPlatform(cleanedUrl)

    if (isBlockedPage(content.title, content.bodyText)) {
      return {
        success: false,
        isBlocked: true,
        error: '네이버에서 접근을 차단했습니다. 잠시 후 다시 시도하거나, 다른 URL을 사용해주세요.',
      }
    }

    return {
      success: true,
      content: {
        url: cleanedUrl,
        platform,
        title: content.title,
        description: content.description,
        images: content.images,
        bodyText: content.bodyText,
        rawHtml: content.rawHtml,
        meta: {
          keywords: content.keywords,
          ogImage: content.ogImage,
          ogTitle: content.ogTitle,
          ogDescription: content.ogDescription,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  } finally {
    if (context) await context.close()
    if (browser) await browser.close()
  }
}

export function validateUrl(url: string): { isValid: boolean; platform: string | null; error?: string } {
  try {
    new URL(url)
  } catch {
    return { isValid: false, platform: null, error: 'Invalid URL format' }
  }

  for (const pattern of NAVER_SMARTSTORE_PATTERNS) {
    if (pattern.test(url)) {
      return { isValid: true, platform: 'naver_smart_store' }
    }
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return { isValid: true, platform: 'unknown' }
  }

  return { isValid: false, platform: null, error: 'URL must start with http:// or https://' }
}
