const ERROR_CODE_MESSAGES: Record<string, string> = {
  'PGRST301': '인증이 필요합니다. 다시 로그인해주세요.',
  'invalid_credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'email_not_confirmed': '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.',
  'user_already_exists': '이미 가입된 이메일입니다.',
  '23505': '이미 존재하는 데이터입니다. 중복된 값을 확인해주세요.',
  '23503': '연결된 데이터가 있어 삭제할 수 없습니다. 먼저 연결된 항목을 삭제해주세요.',
  '23502': '필수 입력값이 누락되었습니다.',
  '23514': '입력값이 허용 범위를 벗어났습니다.',
  '42501': '이 작업을 수행할 권한이 없습니다.',
  'new row violates row-level security': '이 작업을 수행할 권한이 없습니다.',
  'FetchError': '서버 연결에 실패했습니다. 인터넷 연결을 확인해주세요.',
  'TypeError: Failed to fetch': '서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.',
  'Naver API Error': '네이버 API 연동 중 오류가 발생했습니다. API 키 설정을 확인해주세요.',
  'Invalid signature': 'API 서명이 올바르지 않습니다. API 키와 시크릿을 확인해주세요.',
  'Token expired': '인증 토큰이 만료되었습니다. 다시 로그인해주세요.',
}

const DOMAIN_DEFAULT_MESSAGES: Record<string, string> = {
  product: '상품 처리 중 오류가 발생했습니다.',
  order: '주문 처리 중 오류가 발생했습니다.',
  supplier: '공급업체 처리 중 오류가 발생했습니다.',
  courier: '택배업체 처리 중 오류가 발생했습니다.',
  sync: '동기화 중 오류가 발생했습니다.',
  auth: '인증 처리 중 오류가 발생했습니다.',
  notification: '알림 발송 중 오류가 발생했습니다.',
}

const ACTION_ERROR_MESSAGES: Record<string, Record<string, string>> = {
  create: {
    product: '상품 등록에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요.',
    supplier: '공급업체 등록에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요.',
    courier: '택배업체 등록에 실패했습니다. 입력 정보를 확인하고 다시 시도해주세요.',
    order: '주문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.',
  },
  update: {
    product: '상품 정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.',
    supplier: '공급업체 정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.',
    courier: '택배업체 정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.',
    order: '주문 상태 변경에 실패했습니다. 잠시 후 다시 시도해주세요.',
  },
  delete: {
    product: '상품 삭제에 실패했습니다. 연결된 주문이 있는지 확인해주세요.',
    supplier: '공급업체 삭제에 실패했습니다. 연결된 상품을 먼저 해제해주세요.',
    courier: '택배업체 삭제에 실패했습니다. 연결된 공급업체를 먼저 해제해주세요.',
    order: '주문 취소에 실패했습니다. 이미 배송 중인 주문은 취소할 수 없습니다.',
  },
  sync: {
    product: '상품 동기화에 실패했습니다. 네이버 API 설정을 확인해주세요.',
    order: '주문 동기화에 실패했습니다. 네이버 API 설정을 확인해주세요.',
    stock: '재고 동기화에 실패했습니다. 네이버 API 설정을 확인해주세요.',
  },
}

export type ErrorDomain = 'product' | 'order' | 'supplier' | 'courier' | 'sync' | 'auth' | 'notification'
export type ErrorAction = 'create' | 'update' | 'delete' | 'sync' | 'fetch' | 'send'

interface ParsedError {
  message: string
  suggestion?: string
  code?: string
}

export function parseError(
  error: unknown,
  domain?: ErrorDomain,
  action?: ErrorAction
): ParsedError {
  if (!error) {
    return {
      message: '알 수 없는 오류가 발생했습니다.',
      suggestion: '잠시 후 다시 시도해주세요.',
    }
  }

  if (typeof error === 'string') {
    return parseErrorString(error, domain, action)
  }

  if (error instanceof Error) {
    return parseErrorString(error.message, domain, action)
  }

  if (typeof error === 'object' && error !== null) {
    const supabaseError = error as { message?: string; code?: string; details?: string }
    
    if (supabaseError.code && ERROR_CODE_MESSAGES[supabaseError.code]) {
      return {
        message: ERROR_CODE_MESSAGES[supabaseError.code],
        code: supabaseError.code,
      }
    }
    
    if (supabaseError.message) {
      return parseErrorString(supabaseError.message, domain, action)
    }
  }

  return {
    message: domain ? DOMAIN_DEFAULT_MESSAGES[domain] : '오류가 발생했습니다.',
    suggestion: '잠시 후 다시 시도해주세요.',
  }
}

function parseErrorString(
  message: string,
  domain?: ErrorDomain,
  action?: ErrorAction
): ParsedError {
  for (const [key, value] of Object.entries(ERROR_CODE_MESSAGES)) {
    if (message.includes(key)) {
      return { message: value, code: key }
    }
  }

  if (message.includes('violates foreign key constraint')) {
    return {
      message: '연결된 데이터가 있어 삭제할 수 없습니다.',
      suggestion: '먼저 연결된 항목을 삭제하거나 해제해주세요.',
    }
  }

  if (message.includes('duplicate key') || message.includes('unique constraint')) {
    return {
      message: '이미 존재하는 데이터입니다.',
      suggestion: '다른 값을 입력해주세요.',
    }
  }

  if (message.includes('null value')) {
    return {
      message: '필수 입력값이 누락되었습니다.',
      suggestion: '모든 필수 항목을 입력해주세요.',
    }
  }

  if (domain && action && ACTION_ERROR_MESSAGES[action]?.[domain]) {
    return {
      message: ACTION_ERROR_MESSAGES[action][domain],
    }
  }

  if (domain) {
    return {
      message: DOMAIN_DEFAULT_MESSAGES[domain],
      suggestion: '잠시 후 다시 시도해주세요.',
    }
  }

  const sanitizedMessage = sanitizeErrorMessage(message)
  return {
    message: sanitizedMessage || '오류가 발생했습니다.',
    suggestion: '잠시 후 다시 시도해주세요.',
  }
}

function sanitizeErrorMessage(message: string): string {
  const technicalPatterns = [
    /relation ".*?" does not exist/i,
    /column ".*?" does not exist/i,
    /permission denied for/i,
    /pg_.*?/i,
    /SQLSTATE/i,
  ]

  for (const pattern of technicalPatterns) {
    if (pattern.test(message)) {
      return ''
    }
  }

  return message
}

export function formatErrorMessage(error: ParsedError): string {
  if (error.suggestion) {
    return `${error.message} ${error.suggestion}`
  }
  return error.message
}
