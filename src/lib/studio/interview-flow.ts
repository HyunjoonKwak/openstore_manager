// Socratic interview flow ported from detailpage_maker
// (backend/app/routers/interview.py). Pure data + resolution logic.

export interface InterviewQuestion {
  fieldName: string
  question: string
  inputType: 'text' | 'select' | 'complete'
  options?: string[]
  optional?: boolean
}

export const INTERVIEW_FLOW: InterviewQuestion[] = [
  {
    fieldName: 'reference_url',
    question: '참고할 상세페이지 URL이 있나요? (선택사항 — 건너뛰려면 비워두세요)',
    inputType: 'text',
    optional: true,
  },
  {
    fieldName: 'product_name',
    question: '어떤 상품의 상세페이지를 만들까요?',
    inputType: 'text',
  },
  {
    fieldName: 'category',
    question: '이 상품은 어떤 카테고리에 속하나요?',
    inputType: 'select',
    options: ['패션/의류', '뷰티/화장품', '식품', '전자기기', '생활용품', '기타'],
  },
  {
    fieldName: 'target_customer',
    question: '주요 구매 고객은 누구인가요?',
    inputType: 'text',
  },
  {
    fieldName: 'usp',
    question: '이 상품만의 차별점은 무엇인가요?',
    inputType: 'text',
  },
  {
    fieldName: 'price_info',
    question: '가격대와 프로모션 정보가 있나요?',
    inputType: 'text',
  },
  {
    fieldName: 'mood',
    question: '어떤 느낌의 디자인을 원하시나요?',
    inputType: 'select',
    options: ['고급스러운', '캐주얼한', '귀여운', '심플한', '전문적인'],
  },
]

export const COMPLETE_QUESTION: InterviewQuestion = {
  fieldName: 'complete',
  question: '모든 정보가 수집되었습니다. 상세페이지를 생성할 준비가 되었습니다!',
  inputType: 'complete',
}

/** Map interview category answers to template categories. */
export const CATEGORY_TO_TEMPLATE: Record<string, string> = {
  '패션/의류': 'fashion',
  '뷰티/화장품': 'beauty',
  '식품': 'food',
  '전자기기': 'electronics',
  '생활용품': 'home',
  '기타': 'default',
}

/**
 * The next unanswered question, or the completion marker. A field
 * answered with an empty string counts as answered (skipped optional).
 */
export function nextQuestion(context: Record<string, unknown>): InterviewQuestion {
  for (const item of INTERVIEW_FLOW) {
    if (!(item.fieldName in context)) return item
  }
  return COMPLETE_QUESTION
}

/** 0..1 progress for the progress bar. */
export function interviewProgress(context: Record<string, unknown>): number {
  const answered = INTERVIEW_FLOW.filter((item) => item.fieldName in context).length
  return answered / INTERVIEW_FLOW.length
}
