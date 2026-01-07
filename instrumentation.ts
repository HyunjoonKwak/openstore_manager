export async function register() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏭️  Skipping scheduler initialization (build time)')
    return
  }

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('🚀 Server starting - Initializing sync scheduler...')

    try {
      const { loadAllSchedules } = await import('@/lib/scheduler')
      const count = await loadAllSchedules()
      console.log(`✅ Scheduler initialization complete: ${count} schedule(s) loaded`)
    } catch (error) {
      console.error('❌ Failed to initialize schedulers:', error)
    }
  }
}
