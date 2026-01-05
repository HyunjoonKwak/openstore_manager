'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getStores, type StoreInfo } from '@/lib/actions/store-management'

interface StoreContextType {
  stores: StoreInfo[]
  currentStore: StoreInfo | null
  isLoading: boolean
  switchStore: (storeId: string) => void
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

const CURRENT_STORE_KEY = 'current_store_id'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStores = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getStores()
      if (result.data) {
        setStores(result.data)
        
        const savedStoreId = localStorage.getItem(CURRENT_STORE_KEY)
        const savedStore = result.data.find((s: StoreInfo) => s.id === savedStoreId)
        
        if (savedStore) {
          setCurrentStore(savedStore)
        } else if (result.data.length > 0) {
          setCurrentStore(result.data[0])
          localStorage.setItem(CURRENT_STORE_KEY, result.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load stores:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStores()
  }, [loadStores])

  const switchStore = useCallback((storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (store) {
      setCurrentStore(store)
      localStorage.setItem(CURRENT_STORE_KEY, storeId)
      window.location.reload()
    }
  }, [stores])

  const refreshStores = useCallback(async () => {
    await loadStores()
  }, [loadStores])

  return (
    <StoreContext.Provider value={{ stores, currentStore, isLoading, switchStore, refreshStores }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
