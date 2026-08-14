'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { getMarketAccounts, type MarketAccountInfo } from '@/lib/actions/market-accounts'

// Replaces StoreContext. The app shows every market by default; the
// filter narrows queries to one account and is plain client state —
// no cookie, no ambient server resolution.

export type MarketFilterValue = 'all' | string

interface MarketFilterContextType {
  accounts: MarketAccountInfo[]
  /** 'all' or a market_account id */
  filter: MarketFilterValue
  setFilter: (value: MarketFilterValue) => void
  isLoading: boolean
  refreshAccounts: () => Promise<void>
}

const MarketFilterContext = createContext<MarketFilterContextType | undefined>(undefined)

export function MarketFilterProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<MarketAccountInfo[]>([])
  const [filter, setFilter] = useState<MarketFilterValue>('all')
  const [isLoading, setIsLoading] = useState(true)

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getMarketAccounts()
      if (result.data) setAccounts(result.data)
    } catch (error) {
      console.error('Failed to load market accounts:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  return (
    <MarketFilterContext.Provider
      value={{ accounts, filter, setFilter, isLoading, refreshAccounts: loadAccounts }}
    >
      {children}
    </MarketFilterContext.Provider>
  )
}

export function useMarketFilter() {
  const context = useContext(MarketFilterContext)
  if (context === undefined) {
    throw new Error('useMarketFilter must be used within a MarketFilterProvider')
  }
  return context
}

/** Resolve the current filter to a marketAccountId param (undefined = all). */
export function filterToAccountId(filter: MarketFilterValue): string | undefined {
  return filter === 'all' ? undefined : filter
}
