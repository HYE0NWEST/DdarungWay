/**
 * Redis 연결 설정
 */

const redis = require('redis');
const logger = require('../utils/logger');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;
let isRedisConnected = false;
const storage = new Map();
const timeouts = new Map();

/**
 * 🛠️ 더미 클라이언트 (In-memory Fallback)
 * Redis v4 문법 호환 및 TTL(setTimeout) 기능 포함
 */
const dummyClient = {
    get: async (key) => storage.get(key) || null,
    set: async (key, value, options = {}) => {
        storage.set(key, value);
        
        // 이전 타이머가 있다면 제거
        if (timeouts.has(key)) {
            clearTimeout(timeouts.get(key));
            timeouts.delete(key);
        }

        // Redis v4 문법 처리 ({ EX: seconds })
        if (options.EX) {
            const timeoutId = setTimeout(() => {
                storage.delete(key);
                timeouts.delete(key);
                logger.info(`[Fallback] TTL 만료로 키 삭제: ${key}`);
            }, options.EX * 1000);
            timeouts.set(key, timeoutId);
        }
        return 'OK';
    },
    mGet: async (keys) => keys.map(key => storage.get(key) || null),
    mSet: async (obj) => {
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i += 2) {
                storage.set(obj[i], obj[i+1]);
            }
        } else {
            Object.entries(obj).forEach(([k, v]) => storage.set(k, v));
        }
        return 'OK';
    },
    del: async (key) => {
        if (timeouts.has(key)) {
            clearTimeout(timeouts.get(key));
            timeouts.delete(key);
        }
        const deleted = storage.delete(key);
        return deleted ? 1 : 0;
    },
    keys: async (pattern) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return Array.from(storage.keys()).filter(key => regex.test(key));
    },
    on: () => {},
    connect: async () => {},
    quit: async () => {
        timeouts.forEach(clearTimeout);
        timeouts.clear();
        storage.clear();
    }
};

async function connectRedis() {
    try {
        client = redis.createClient({
            url: REDIS_URL,
            socket: {
                reconnectStrategy: false // 즉시 실패 처리 (재시도 안 함)
            }
        });

        // 에러 이벤트가 발생해도 로그를 출력하지 않고 상태만 업데이트 (터미널 정돈)
        client.on('error', () => {
            isRedisConnected = false;
        });

        client.on('connect', () => {
            isRedisConnected = true;
            logger.info('✅ Redis 실서버 연결됨');
        });

        await client.connect();
        return client;

    } catch (error) {
        // 연결 실패 시 딱 한 번만 깔끔한 안내 문구를 출력합니다.
        logger.warn('ℹ️  Redis 서버 미감지: 인메모리 Fallback 모드로 안전하게 시작합니다.');
        isRedisConnected = false;
        client = dummyClient;
        return client;
    }
}

function getClient() {
    if (isRedisConnected && client) {
        return client;
    }
    return dummyClient;
}

module.exports = {
    connectRedis,
    getRedisClient: getClient
};
