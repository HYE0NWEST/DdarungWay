/**
 * 관심 정류소(watchlist) 관련 테스트 - 권한 검증 중점
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const UserWatchlist = require('../src/models/UserWatchlist');

describe('Watchlist API Tests (권한 검증)', () => {
    let user1Token;
    let user2Token;
    let user1Id;
    let user2Id;

    beforeAll(async () => {
        // 테스트 유저 2명 생성
        const user1 = await User.create({
            email: 'user1@test.com',
            password: 'pass123',
            username: 'user1'
        });
        user1Id = user1._id.toString();

        const user2 = await User.create({
            email: 'user2@test.com',
            password: 'pass123',
            username: 'user2'
        });
        user2Id = user2._id.toString();

        // 로그인하여 토큰 획득
        const res1 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user1@test.com', password: 'pass123' });
        user1Token = res1.body.accessToken;

        const res2 = await request(app)
            .post('/api/auth/login')
            .send({ email: 'user2@test.com', password: 'pass123' });
        user2Token = res2.body.accessToken;
    });

    afterAll(async () => {
        await User.deleteMany({ email: { $in: ['user1@test.com', 'user2@test.com'] } });
        await UserWatchlist.deleteMany({});
    });

    test('[POST] /api/users/watchlist - 관심 정류소 등록 가능', async () => {
        const res = await request(app)
            .post('/api/users/watchlist')
            .set('Authorization', `Bearer ${user1Token}`)
            .send({
                stationId: 'ST-001',
                stationName: '신도림역 1번 출구'
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
    });

    test('[GET] /api/users/watchlist - 자신의 목록 조회 가능', async () => {
        // user1이 자신의 목록 조회 (성공)
        const res1 = await request(app)
            .get('/api/users/watchlist')
            .set('Authorization', `Bearer ${user1Token}`);

        expect(res1.status).toBe(200);
        expect(res1.body.count).toBeGreaterThan(0);
    });

    test('[GET] /api/users/watchlist - 토큰 없이 접근 시 401 반환', async () => {
        const res = await request(app)
            .get('/api/users/watchlist');

        expect(res.status).toBe(401);
    });
});
