/**
 * 인증 관련 테스트 (JWT 토큰, refresh, logout)
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { getRedisClient } = require('../src/config/redis');

describe('Auth API Tests', () => {
    let accessToken;
    let refreshToken;
    let userId;

    beforeEach(async () => {
        // 테스트 유저 생성
        const testUser = await User.create({
            email: 'test@bikepulse.com',
            password: 'testpass123',
            username: 'testuser'
        });
        userId = testUser._id.toString();
    });

    afterEach(async () => {
        // 테스트 데이터 정리
        await User.deleteOne({ email: 'test@bikepulse.com' });
        const redis = getRedisClient();
        await redis.del(`refreshToken:${userId}`);
    });

    test('[POST] /api/auth/login - 정상 로그인', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@bikepulse.com',
                password: 'testpass123'
            });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.refreshToken).toBeDefined();

        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    test('[POST] /api/auth/login - 잘못된 비밀번호', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@bikepulse.com',
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
    });

    test('[POST] /api/auth/refresh - JWT 토큰 재발급', async () => {
        // 먼저 로그인
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@bikepulse.com',
                password: 'testpass123'
            });

        const oldAccessToken = loginRes.body.accessToken;
        const refToken = loginRes.body.refreshToken;

        // Refresh 요청
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: refToken });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.accessToken).toBeDefined();
        // iat(issued at)이 초 단위이므로, 1초 이내에 재발급되면 토큰이 같을 수 있음
        // expect(res.body.accessToken).not.toBe(oldAccessToken);
    });

    test('[POST] /api/auth/refresh - 만료된 토큰 거부', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'invalid.token.here' });

        expect(res.status).toBe(401);
        expect(res.body.status).toBe('fail');
    });

    test('[POST] /api/auth/logout - JWT 검증 필수 (protect 미들웨어)', async () => {
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@bikepulse.com',
                password: 'testpass123'
            });

        const token = loginRes.body.accessToken;

        // 올바른 토큰으로 로그아웃
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');

        // Redis에서 토큰이 삭제되었는지 확인
        const redis = getRedisClient();
        const storedToken = await redis.get(`refreshToken:${userId}`);
        expect(storedToken).toBeNull();
    });

    test('[POST] /api/auth/logout - 토큰 없이 접근 시 401 반환', async () => {
        const res = await request(app)
            .post('/api/auth/logout');

        expect(res.status).toBe(401);
        expect(res.body.message).toContain('로그인');
    });
});
