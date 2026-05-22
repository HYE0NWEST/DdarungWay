/**
 * Station API 테스트 (Mocking 버전)
 * 외부 DB(MongoDB, Redis) 없이도 npm install 만으로 실행 가능합니다.
 */

const request = require('supertest');
const app = require('../src/app');
const { getRedisClient } = require('../src/config/redis');

jest.mock('../src/models/Station', () => ({
    find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([
            {
                stationId: 'ST-TEST-001',
                name: '테스트 정류소',
                district: '강남구',
                totalRackCount: 20,
                location: { type: 'Point', coordinates: [127.027, 37.497] }
            }
        ])
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
            stationId: 'ST-TEST-001',
            name: '테스트 정류소',
            district: '강남구',
            totalRackCount: 20,
            location: { type: 'Point', coordinates: [127.027, 37.497] }
        })
    })
}));

describe('Station API Mock Test (Environment Independent)', () => {
    beforeAll(async () => {
        const redis = getRedisClient();
        await redis.set('station:ST-TEST-001', '15');
    });

    test('[GET] /api/stations - 목록 조회 테스트 (Mocking)', async () => {
        const res = await request(app)
            .get('/api/stations')
            .query({ page: 1, limit: 10 });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data[0].stationId).toBe('ST-TEST-001');
        // Redis Mock 값(15)이 잘 반영되었는지 확인
        expect(res.body.data[0].availableBikes).toBe(15);
    });

    test('[GET] /api/stations/:id - 상세 조회 테스트 (Mocking)', async () => {
        const res = await request(app).get('/api/stations/ST-TEST-001');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('테스트 정류소');
        // 계산 로직 확인: (bikeCount 15 / totalRackCount 20) = 0.75
        expect(res.body.data.availabilityRate).toBe("0.75");
    });

    test('[GET] /api/stations/:id - 정류소가 없을 때 404 반환 확인', async () => {
        // 특정 테스트를 위해 findOne이 null을 반환하도록 임시로 설정
        const Station = require('../src/models/Station');
        Station.findOne.mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue(null)
        });

        const res = await request(app).get('/api/stations/NOT-FOUND');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
