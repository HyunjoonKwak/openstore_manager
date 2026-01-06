import { CarrierScraper } from './base'
import { HanjinScraper } from './hanjin'
import { CJScraper } from './cj'
import { LogenScraper } from './logen'
import { EpostScraper } from './epost'
import { LotteScraper } from './lotte'
import { CoupangScraper } from './coupang'
import { KdexpScraper } from './kdexp'
import { DaesinScraper } from './daesin'
import { CVSnetScraper } from './cvsnet'
import { ChunilpsScraper } from './chunilps'
import { KunyoungScraper } from './kunyoung'
import { IlyangLogisScraper } from './ilyanglogis'
import { HonamLogisScraper } from './honamlogis'
import { CwayScraper } from './cway'
import { HomepickScraper } from './homepick'
import { PantosScraper } from './epantos'
import { SLXScraper } from './slx'
import { TodayPickupScraper } from './todaypickup'
import { YongmaLogisScraper } from './yongmalogis'
import { EpostEmsScraper } from './epost-ems'
import { LotteGlobalScraper } from './lotte-global'
import { GoodsToLuckScraper } from './goodstoluck'
import type { TrackInfo, CarrierInfo } from './types'
import { CARRIERS, getCarrierById, getAllCarriers } from './types'

export * from './types'
export * from './base'

const scraperInstances: Map<string, CarrierScraper> = new Map()

function getScraperInstance(carrierId: string): CarrierScraper | null {
  const id = carrierId.toUpperCase()
  
  if (scraperInstances.has(id)) {
    return scraperInstances.get(id)!
  }

  let scraper: CarrierScraper | null = null

  switch (id) {
    case 'HANJIN':
      scraper = new HanjinScraper()
      break
    case 'CJ':
      scraper = new CJScraper()
      break
    case 'LOGEN':
      scraper = new LogenScraper()
      break
    case 'EPOST':
      scraper = new EpostScraper()
      break
    case 'LOTTE':
      scraper = new LotteScraper()
      break
    case 'COUPANG':
      scraper = new CoupangScraper()
      break
    case 'KDEXP':
      scraper = new KdexpScraper()
      break
    case 'DAESIN':
      scraper = new DaesinScraper()
      break
    case 'CVSNET':
      scraper = new CVSnetScraper()
      break
    case 'CHUNILPS':
      scraper = new ChunilpsScraper()
      break
    case 'KUNYOUNG':
      scraper = new KunyoungScraper()
      break
    case 'ILYANGLOGIS':
      scraper = new IlyangLogisScraper()
      break
    case 'HONAMLOGIS':
      scraper = new HonamLogisScraper()
      break
    case 'CWAY':
      scraper = new CwayScraper()
      break
    case 'HOMEPICK':
      scraper = new HomepickScraper()
      break
    case 'EPANTOS':
      scraper = new PantosScraper()
      break
    case 'SLX':
      scraper = new SLXScraper()
      break
    case 'TODAYPICKUP':
      scraper = new TodayPickupScraper()
      break
    case 'YONGMALOGIS':
      scraper = new YongmaLogisScraper()
      break
    case 'EPOST_EMS':
      scraper = new EpostEmsScraper()
      break
    case 'LOTTE_GLOBAL':
      scraper = new LotteGlobalScraper()
      break
    case 'GOODSTOLUCK':
      scraper = new GoodsToLuckScraper()
      break
    default:
      return null
  }

  if (scraper) {
    scraperInstances.set(id, scraper)
  }

  return scraper
}

export async function trackPackage(
  carrierId: string,
  trackingNumber: string
): Promise<TrackInfo> {
  const scraper = getScraperInstance(carrierId)
  
  if (!scraper) {
    const carrier = getCarrierById(carrierId)
    return {
      success: false,
      carrier: {
        id: carrierId,
        name: carrier?.displayName || carrierId,
      },
      trackingNumber,
      sender: null,
      recipient: null,
      events: [],
      error: `지원하지 않는 택배사입니다: ${carrierId}`,
    }
  }

  return scraper.track(trackingNumber)
}

export function getSupportedCarriers(): CarrierInfo[] {
  const supportedIds = [
    'HANJIN', 'CJ', 'LOGEN', 'EPOST', 'LOTTE',
    'COUPANG', 'KDEXP', 'DAESIN', 'CVSNET', 'CHUNILPS',
    'KUNYOUNG', 'ILYANGLOGIS', 'HONAMLOGIS', 'CWAY', 'HOMEPICK',
    'EPANTOS', 'SLX', 'TODAYPICKUP', 'YONGMALOGIS',
    'EPOST_EMS', 'LOTTE_GLOBAL', 'GOODSTOLUCK',
  ]
  return getAllCarriers().filter((carrier) => supportedIds.includes(carrier.id))
}

export function isCarrierSupported(carrierId: string): boolean {
  return getScraperInstance(carrierId) !== null
}

export { CARRIERS, getCarrierById, getAllCarriers }
