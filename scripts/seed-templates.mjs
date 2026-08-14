#!/usr/bin/env node
// Insert the 8 shared studio template seeds via REST (service role).
// Same source of truth as 111_seed_studio_templates.sql: extracted from
// detailpage_maker's database.py + templates/default.html.
// Idempotent: skips names that already exist as shared seeds.
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

const DETAILPAGE_ROOT = `${process.env.HOME}/code_work/detailpage_maker/backend`

async function loadEnv(file) {
  const text = await readFile(file, 'utf8')
  const env = {}
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
  return env
}

async function main() {
  const env = await loadEnv('.env.local')
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const databasePy = await readFile(`${DETAILPAGE_ROOT}/app/models/database.py`, 'utf8')
  const templates = {}
  for (const match of databasePy.matchAll(/^(TEMPLATE_[A-Z_]+) = """([\s\S]*?)"""/gm)) {
    templates[match[1]] = match[2]
  }
  const defaultHtml = await readFile(`${DETAILPAGE_ROOT}/templates/default.html`, 'utf8')

  const seeds = [
    { name: '기본', category: 'default', description: '카테고리 무관 기본 템플릿', is_default: true, html_template: defaultHtml },
    { name: '모던 미니멀', category: 'fashion', description: '깔끔하고 세련된 패션 아이템용 템플릿', is_default: true, html_template: templates.TEMPLATE_FASHION },
    { name: '럭셔리 뷰티', category: 'beauty', description: '고급스러운 화장품/뷰티 제품용 템플릿', is_default: true, html_template: templates.TEMPLATE_BEAUTY },
    { name: '맛있는 유혹', category: 'food', description: '식욕을 자극하는 식품용 템플릿', is_default: true, html_template: templates.TEMPLATE_FOOD },
    { name: '테크 스펙', category: 'electronics', description: '전자기기 스펙 강조 템플릿', is_default: true, html_template: templates.TEMPLATE_ELECTRONICS },
    { name: '홈 라이프', category: 'home', description: '따뜻한 생활용품용 템플릿', is_default: true, html_template: templates.TEMPLATE_HOME },
    { name: '프리미엄 블랙', category: 'fashion', description: '다크 테마의 프리미엄 패션 템플릿', is_default: false, html_template: templates.TEMPLATE_FASHION_DARK },
    { name: '싱싱 과일', category: 'food', description: '신선한 과일 상품을 위한 자연 친화적 템플릿', is_default: false, html_template: templates.TEMPLATE_FRUIT },
  ]

  const { data: existing } = await supabase
    .from('studio_templates')
    .select('name')
    .is('user_id', null)
  const existingNames = new Set((existing || []).map((row) => row.name))

  let inserted = 0
  for (const seed of seeds) {
    if (existingNames.has(seed.name)) {
      console.log(`skip (exists): ${seed.name}`)
      continue
    }
    if (!seed.html_template) {
      console.error(`MISSING TEMPLATE SOURCE: ${seed.name}`)
      process.exitCode = 1
      continue
    }
    const { error } = await supabase
      .from('studio_templates')
      .insert({ user_id: null, ...seed })
    if (error) {
      console.error(`FAIL ${seed.name}: ${error.message}`)
      process.exitCode = 1
    } else {
      console.log(`inserted: ${seed.name} (${seed.category})`)
      inserted++
    }
  }
  console.log(`done: ${inserted} inserted, ${existingNames.size} pre-existing`)
}

main().catch((error) => {
  console.error('Seed failed:', error.message)
  process.exit(1)
})
