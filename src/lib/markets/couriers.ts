// Client-safe courier codes for market shipment registration.
// Codes follow the Naver deliveryCompanyCode registry, which the
// dispatch adapters translate as needed.

export const DISPATCH_COURIERS = [
  { code: 'CJGLS', name: 'CJ대한통운' },
  { code: 'HANJIN', name: '한진택배' },
  { code: 'LOTTE', name: '롯데택배' },
  { code: 'EPOST', name: '우체국택배' },
  { code: 'LOGEN', name: '로젠택배' },
  { code: 'KGB', name: '로젠택배(KGB)' },
  { code: 'CVSNET', name: 'GS편의점택배' },
  { code: 'DAESIN', name: '대신택배' },
  { code: 'ILYANG', name: '일양로지스' },
  { code: 'HDEXP', name: '합동택배' },
] as const

export function courierName(code: string | null): string {
  if (!code) return '-'
  return DISPATCH_COURIERS.find((courier) => courier.code === code)?.name || code
}
