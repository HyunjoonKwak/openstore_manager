'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { getCurrentStoreId, getStores, setCurrentStoreId, type StoreInfo } from '@/lib/actions/store-management'
import { useRouter } from 'next/navigation'

interface StoreContextType {
  stores: StoreInfo[]
  currentStore: StoreInfo | null
  isLoading: boolean
  switchStore: (storeId: string) => Promise<void>
  refreshStores: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [currentStore, setCurrentStore] = useState<StoreInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStores = useCallback(async () => {
    setIsLoading(true)
    try {
      const [result, savedStoreId] = await Promise.all([getStores(), getCurrentStoreId()])
      if (result.data) {
        setStores(result.data)
        const savedStore = result.data.find((s: StoreInfo) => s.id === savedStoreId)
        
        if (savedStore) {
          setCurrentStore(savedStore)
        } else if (result.data.length > 0) {
          setCurrentStore(result.data[0])
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

  const switchStore = useCallback(async (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (store) {
      const result = await setCurrentStoreId(storeId)
      if (result.success) {
        setCurrentStore(store)
        router.refresh()
      }
    }
  }, [router, stores])

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
