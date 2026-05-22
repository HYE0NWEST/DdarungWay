/**
 * 에러 코드 표준화 및 응답 포맷 일관화
 */

// ========== 에러 코드 정의 ==========
const ERROR_CODES = {
    // 인증 관련 (4xx)
    UNAUTHORIZED: { code: 401, message: '인증이 필요합니다. 로그인해주세요.' },
    INVALID_TOKEN: { code: 401, message: '유효하지 않은 토큰입니다.' },
    TOKEN_EXPIRED: { code: 401, message: '토큰이 만료되었습니다. 다시 로그인해주세요.' },

    // 권한 관련 (403)
    FORBIDDEN: { code: 403, message: '이 작업을 수행할 권한이 없습니다.' },
    DIFFERENT_USER: { code: 403, message: '다른 사용자의 데이터에 접근할 수 없습니다.' },

    // 요청 검증 (400)
    BAD_REQUEST: { code: 400, message: '잘못된 요청입니다.' },
    MISSING_PARAMETER: { code: 400, message: '필수 파라미터가 누락되었습니다.' },

    // 결제 관련 (402)
    PAYMENT_REQUIRED: { code: 402, message: '미수금이 있습니다. 결제 후 진행해주세요.' },

    // 충돌 (409)
    CONFLICT: { code: 409, message: '요청이 충돌했습니다. 잠시 후 다시 시도해주세요.' },
    DUPLICATE_EMAIL: { code: 409, message: '이미 사용 중인 이메일입니다.' },
    ACTIVE_TRIP_EXISTS: { code: 409, message: '이미 진행 중인 여행이 있습니다.' },

    // 찾기 실패 (404)
    NOT_FOUND: { code: 404, message: '요청한 리소스를 찾을 수 없습니다.' },

    // 서버 에러 (500)
    INTERNAL_SERVER_ERROR: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
};

// ========== 응답 포맷 일관화 ==========
class ApiError extends Error {
    constructor(errorType, customMessage = null) {
        const errorInfo = ERROR_CODES[errorType] || ERROR_CODES.INTERNAL_SERVER_ERROR;
        super(customMessage || errorInfo.message);
        this.status = errorInfo.code;
        this.errorType = errorType;
    }
}

// ========== 에러 핸들러 미들웨어 ==========
const errorHandler = (err, req, res) => {
    let error = err;

    // ApiError가 아닌 경우 변환
    if (!(error instanceof ApiError)) {
        if (error.name === 'JsonWebTokenError') {
            error = new ApiError('INVALID_TOKEN');
        } else if (error.name === 'TokenExpiredError') {
            error = new ApiError('TOKEN_EXPIRED');
        } else {
            error = new ApiError('INTERNAL_SERVER_ERROR', error.message);
        }
    }

    const status = error.status || 500;
    const response = {
        status: 'error',
        code: error.errorType || 'UNKNOWN_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
    };

    // 개발 환경에서만 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
    }

    res.status(status).json(response);
};

module.exports = {
    ApiError,
    ERROR_CODES,
    errorHandler
};
