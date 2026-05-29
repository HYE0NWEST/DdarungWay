/**
 * 상수 정의
 */

module.exports = {
    // 상태 구분
    AVAILABILITY_STATUS: {
        ABUNDANT: 'abundant',      // 충분 (> 50%)
        NORMAL: 'normal',          // 보통 (25% ~ 50%)
        SCARCE: 'scarce'           // 부족 (< 25%)
    },

    // 여행(대여/예약) 상태
    TRIP_STATUS: {
        RESERVED: 'RESERVED',      // 예약됨
        STARTED: 'STARTED',        // 대여 시작
        IN_PROGRESS: 'IN_PROGRESS', // 이용 중
        COMPLETED: 'COMPLETED',    // 반납 완료
        CANCELLED: 'CANCELLED'     // 취소됨
    },

    // 변화 타입
    CHANGE_TYPE: {
        RENTAL: 'RENTAL',
        RETURN: 'RETURN'
    },

    // 예측 추세
    TREND: {
        UP: 'UP',
        DOWN: 'DOWN',
        STABLE: 'STABLE'
    },

    // Redis TTL (초)
    REDIS_TTL: {
        STATION_STATUS: 3600,    // 1시간
        USER_SESSION: 86400 * 7   // 7일
    },

    // Polling 설정
    POLLING: {
        INTERVAL_MS: parseInt(process.env.DDAREUNGI_POLLING_INTERVAL) || 30000,
        TIMEOUT_MS: parseInt(process.env.DDAREUNGI_TIMEOUT) || 5000
    },

    // 예측 설정
    PREDICTION: {
        HISTORY_MINUTES: parseInt(process.env.PREDICTION_HISTORY_MINUTES) || 15,
        THRESHOLD: parseFloat(process.env.PREDICTION_THRESHOLD) || 0.7,
        MIN_DATA_POINTS: 1
    },

    // 반경 검색 (미터)
    GEOSPATIAL: {
        DEFAULT_RADIUS: 500,
        MAX_RADIUS: 2000
    }
};
