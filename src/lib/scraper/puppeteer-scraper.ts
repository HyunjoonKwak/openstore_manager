import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, Page } from 'puppeteer-core'

puppeteer.use(StealthPlugin())

export interface ScrapedContent {
  url: string
  platform: string
  title: string | null
  description: string | null
  images: string[]
  bodyText: string
  rawHtml: string
  screenshot?: string
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
}

const NAVER_SMARTSTORE_PATTERNS = [
  /^https?:\/\/smartstore\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/m\.smartstore\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/brand\.naver\.com\/.+\/products\/\d+/,
  /^https?:\/\/shopping\.naver\.com\/.*\/products\/\d+/,
]

const CHROME_PATHS = [
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomDelay(min: number, max: number): Promise<void> {
  return delay(Math.floor(Math.random() * (max - min + 1)) + min)
}

async function findChromePath(): Promise<string | undefined> {
  const fs = await import('fs')
  for (const path of CHROME_PATHS) {
    if (fs.existsSync(path)) {
      return path
    }
  }
  return undefined
}

function isBlockedPage(title: string, bodyText: string): boolean {
  const blockedIndicators = [
    '보안 확인',
    '캡차',
    'captcha',
    '비정상적인 접근',
    '잠시 후 다시',
    '정답을 입력',
  ]
  
  const combined = `${title} ${bodyText}`.toLowerCase()
  return blockedIndicators.some(indicator => combined.includes(indicator.toLowerCase()))
}

export async function scrapeWithPuppeteer(url: string, captureScreenshot = false): Promise<ScrapeResult> {
  const cleanedUrl = cleanUrl(url)
  let browser: Browser | null = null

  try {
    const executablePath = await findChromePath()
    
    if (!executablePath) {
      return {
        success: false,
        error: 'Chrome browser not found. Please install Chrome.',
      }
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    })

    const page: Page = await browser!.newPage()

    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
    })

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    })

    await randomDelay(500, 1500)

    await page.goto(cleanedUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    await randomDelay(2000, 4000)

    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        100 + Math.random() * 400,
        100 + Math.random() * 400
      )
      await randomDelay(100, 300)
    }

    await page.evaluate(() => window.scrollTo(0, 500))
    await randomDelay(500, 1000)
    await page.evaluate(() => window.scrollTo(0, 0))
    await randomDelay(1000, 2000)

    const content = await page.evaluate(() => {
      const scripts = document.querySelectorAll('script, style, noscript, iframe')
      scripts.forEach(el => el.remove())

      const title = document.title ||
        document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
        document.querySelector('h1')?.textContent?.trim() ||
        ''

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

      return {
        title,
        description,
        images: images.slice(0, 20),
        bodyText: bodyText.slice(0, 15000),
        rawHtml: document.documentElement.outerHTML.slice(0, 50000),
        keywords,
        ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
        ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || null,
        ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || null,
      }
    })

    if (isBlockedPage(content.title, content.bodyText)) {
      let screenshot: string | undefined
      if (captureScreenshot) {
        const screenshotBuffer = await page.screenshot({ 
          fullPage: true,
          type: 'jpeg',
          quality: 80,
        })
        screenshot = `data:image/jpeg;base64,${Buffer.from(screenshotBuffer).toString('base64')}`
      }

      return {
        success: false,
        isBlocked: true,
        error: '네이버에서 접근을 차단했습니다.',
        content: captureScreenshot ? {
          url: cleanedUrl,
          platform: detectPlatform(cleanedUrl),
          title: null,
          description: null,
          images: [],
          bodyText: '',
          rawHtml: '',
          screenshot,
          meta: { keywords: [], ogImage: null, ogTitle: null, ogDescription: null },
        } : undefined,
      }
    }

    let screenshot: string | undefined
    if (captureScreenshot) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await randomDelay(500, 1000)
      
      const screenshotBuffer = await page.screenshot({ 
        fullPage: true,
        type: 'jpeg',
        quality: 85,
      })
      screenshot = `data:image/jpeg;base64,${Buffer.from(screenshotBuffer).toString('base64')}`
    }

    return {
      success: true,
      content: {
        url: cleanedUrl,
        platform: detectPlatform(cleanedUrl),
        title: content.title,
        description: content.description,
        images: content.images,
        bodyText: content.bodyText,
        rawHtml: content.rawHtml,
        screenshot,
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
    if (browser) await browser.close()
  }
}
