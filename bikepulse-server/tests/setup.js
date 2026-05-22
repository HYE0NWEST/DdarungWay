/**
 * Jest 테스트 환경 설정
 */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

require('dotenv').config({ path: '.env.test' });

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// 인메모리 Redis 저장소 (모든 테스트에서 공유)
const mockRedisStore = new Map();

const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(true),
    on: jest.fn(),
    get: jest.fn().mockImplementation(async (key) => mockRedisStore.get(key) || null),
    set: jest.fn().mockImplementation(async (key, value) => {
        mockRedisStore.set(key, value);
        return 'OK';
    }),
    mGet: jest.fn().mockImplementation(async (keys) => keys.map(key => mockRedisStore.get(key) || null)),
    mSet: jest.fn().mockImplementation(async (obj) => {
        if (Array.isArray(obj)) {
            for (let i = 0; i < obj.length; i += 2) {
                mockRedisStore.set(obj[i], obj[i+1]);
            }
        } else {
            Object.entries(obj).forEach(([k, v]) => mockRedisStore.set(k, v));
        }
        return 'OK';
    }),
    del: jest.fn().mockImplementation(async (...keys) => {
        let count = 0;
        keys.forEach(key => {
            if (mockRedisStore.delete(key)) count++;
        });
        return count;
    }),
    keys: jest.fn().mockImplementation(async (pattern) => {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return Array.from(mockRedisStore.keys()).filter(key => regex.test(key));
    }),
    quit: jest.fn().mockResolvedValue('OK'),
    isOpen: true
};

// Redis 클라이언트 전역 모킹
jest.mock('../src/config/redis', () => ({
    connectRedis: jest.fn().mockResolvedValue(mockRedisClient),
    getRedisClient: jest.fn().mockReturnValue(mockRedisClient)
}));

let mongoServer;

// 모든 테스트 시작 전 실행
beforeAll(async () => {
    // MongoDB Memory Server 시작
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    process.env.MONGODB_URI = uri;

    // Mongoose 연결
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
    }
    
    // 테스트마다 Redis 저장소 초기화
    mockRedisStore.clear();
});

// 모든 테스트 종료 후 실행
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// 테스트 타임아웃
jest.setTimeout(30000);
