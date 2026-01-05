import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

interface ApiConfigJson {
  openaiApiKey?: string
}

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { data: store } = await supabase
      .from('stores')
      .select('api_config')
      .eq('user_id', userData.user.id)
      .single()

    const apiConfig = (store?.api_config || {}) as ApiConfigJson
    const apiKey = apiConfig.openaiApiKey || process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API 키가 설정되지 않았습니다.' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({ apiKey })
    const models = await openai.models.list()
    
    const hasGPT4 = models.data.some(m => m.id.includes('gpt-4'))
    const hasGPT35 = models.data.some(m => m.id.includes('gpt-3.5'))

    return NextResponse.json({
      success: true,
      message: 'OpenAI API 연결 성공!',
      details: {
        modelsAvailable: models.data.length,
        gpt4Available: hasGPT4,
        gpt35Available: hasGPT35,
      },
    })
  } catch (error) {
    console.error('OpenAI connection test error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('Incorrect API key') || errorMessage.includes('invalid_api_key')) {
      return NextResponse.json(
        { success: false, error: 'API 키가 올바르지 않습니다.' },
        { status: 401 }
      )
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('rate_limit')) {
      return NextResponse.json(
        { success: false, error: 'API 사용량 한도에 도달했습니다.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: `연결 테스트 실패: ${errorMessage}` },
      { status: 500 }
    )
  }
}
