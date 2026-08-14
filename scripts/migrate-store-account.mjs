#!/usr/bin/env node
// One-off: carry legacy_stores rows over to market_accounts.
// api_config moves verbatim — secrets stay encrypted with the same
// SECRETS_ENCRYPTION_KEY, so no re-entry needed. Idempotent by
// (user_id, name).
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

async function loadEnv(file) {
  const text = await readFile(file, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

const PLATFORM_MAP = { Naver: 'naver', Coupang: 'coupang' }

async function main() {
  const env = await loadEnv('.env.local')
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: stores, error } = await supabase.from('legacy_stores').select('*')
  if (error) throw new Error(error.message)

  for (const store of stores || []) {
    const platform = PLATFORM_MAP[store.platform]
    if (!platform) {
      console.log(`skip (unsupported platform ${store.platform}): ${store.store_name}`)
      continue
    }

    const { data: existing } = await supabase
      .from('market_accounts')
      .select('id')
      .eq('user_id', store.user_id)
      .eq('name', store.store_name)
      .maybeSingle()
    if (existing) {
      console.log(`skip (exists): ${store.store_name}`)
      continue
    }

    const { data: created, error: insertError } = await supabase
      .from('market_accounts')
      .insert({
        user_id: store.user_id,
        platform,
        name: store.store_name,
        api_config: store.api_config || {},
        notification_webhook_url: store.notification_webhook_url || null,
        notification_enabled: Boolean(store.notification_enabled),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(`FAIL ${store.store_name}: ${insertError.message}`)
      process.exitCode = 1
    } else {
      const keys = Object.keys(store.api_config || {}).filter(
        (key) => typeof (store.api_config || {})[key] === 'string' && (store.api_config || {})[key]
      )
      console.log(`created: ${store.store_name} (${platform}) id=${created.id}`)
      console.log(`  carried api_config keys: ${keys.join(', ') || '(none)'}`)
    }
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message)
  process.exit(1)
})
