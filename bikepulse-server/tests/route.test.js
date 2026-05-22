/**
 * 경로(Route) 관련 테스트 - Redis 캐싱 로직
 */
const request = require('supertest');
const app = require('../src/app');
const { getRedisClient } = require('../src/config/redis');

// TMAP API 호출을 피하기 위해 RouteService 모킹
jest.mock('../src/services/routeService', () => ({
    getPedestrianRoute: jest.fn().mockResolvedValue([
        { x: 126.978, y: 37.566 },
        { x: 127.028, y: 37.496 }
    ])
}));

describe('Route API Tests (Redis 캐싱)', () => {
    afterEach(async () => {
        // 테스트 후 캐시 정리
        const redis = getRedisClient();
        const keys = await redis.keys('route:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    });

    test('[POST] /api/routes/pedestrian - 정상 경로 조회', async () => {
        const res = await request(app)
            .post('/api/routes/pedestrian')
            .send({
                startX: 126.978,
                startY: 37.566,
                endX: 127.028,
                endY: 37.496
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.coordinates).toBeDefined();
    });

    test('[POST] /api/routes/pedestrian - 필수 파라미터 없으면 400 반환', async () => {
        const res = await request(app)
            .post('/api/routes/pedestrian')
            .send({
                startX: 126.978,
                startY: 37.566
                // endX, endY 누락
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test('[POST] /api/routes/pedestrian - Redis 캐싱 동작 확인', async () => {
        const cacheKey = 'route:126.978,37.566:127.028,37.496';
        const redis = getRedisClient();

        // 첫 요청
        const res1 = await request(app)
            .post('/api/routes/pedestrian')
            .send({
                startX: 126.978,
                startY: 37.566,
                endX: 127.028,
                endY: 37.496
            });

        expect(res1.status).toBe(200);

        // Redis에 캐시되었는지 확인
        const cached = await redis.get(cacheKey);
        expect(cached).not.toBeNull();
        expect(JSON.parse(cached).success).toBe(true);
    });
});
