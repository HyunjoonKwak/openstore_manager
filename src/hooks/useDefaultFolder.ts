'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'store-manager-default-folder'

interface FolderSettings {
  orderDownloadPath: string
  trackingUploadPath: string
}

const DEFAULT_SETTINGS: FolderSettings = {
  orderDownloadPath: '',
  trackingUploadPath: '',
}

export function useDefaultFolder() {
  const [settings, setSettings] = useState<FolderSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          setSettings(JSON.parse(saved))
        } catch {
          setSettings(DEFAULT_SETTINGS)
        }
      }
      setIsLoaded(true)
    }
  }, [])

  const updateSettings = useCallback((newSettings: Partial<FolderSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      }
      return updated
    })
  }, [])

  const setOrderDownloadPath = useCallback((path: string) => {
    updateSettings({ orderDownloadPath: path })
  }, [updateSettings])

  const setTrackingUploadPath = useCallback((path: string) => {
    updateSettings({ trackingUploadPath: path })
  }, [updateSettings])

  const setSamePath = useCallback((path: string) => {
    updateSettings({ orderDownloadPath: path, trackingUploadPath: path })
  }, [updateSettings])

  return {
    orderDownloadPath: settings.orderDownloadPath,
    trackingUploadPath: settings.trackingUploadPath,
    setOrderDownloadPath,
    setTrackingUploadPath,
    setSamePath,
    isLoaded,
  }
}
