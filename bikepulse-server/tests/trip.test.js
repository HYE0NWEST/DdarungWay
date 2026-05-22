/**
 * 여행(Trip) 관련 테스트 - 시작/완료/취소 흐름
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const Payment = require('../src/models/Payment');
const Station = require('../src/models/Station');
const { getRedisClient } = require('../src/config/redis');

describe('Trip API Tests', () => {
    let userToken;
    let userId;
    let tripId;

    beforeAll(async () => {
        const user = await User.create({
            email: 'tripper@test.com',
            password: 'pass123',
            username: 'tripper'
        });
        userId = user._id.toString();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'tripper@test.com', password: 'pass123' });
        userToken = res.body.accessToken;

        // MongoDB에 정류소 데이터 생성 (startTrip에서 조회함)
        await Station.create([
            { stationId: 'ST-001', name: '테스트 정류소 1', location: { coordinates: [126.9, 37.5] } },
            { stationId: 'ST-002', name: '테스트 정류소 2', location: { coordinates: [127.0, 37.6] } }
        ]);

        // Redis에 정류소 데이터 미리 생성
        const redis = getRedisClient();
        await redis.set('station:ST-001', '5');
        await redis.set('station:ST-002', '3');
    });

    afterAll(async () => {
        await User.deleteOne({ email: 'tripper@test.com' });
        await Trip.deleteMany({ userId });
        await Payment.deleteMany({ userId });
    });

    test('[POST] /api/trips/start - 여행 시작 성공', async () => {
        const res = await request(app)
            .post('/api/trips/start')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-001' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.trip._id).toBeDefined();
        expect(res.body.data.trip.status).toBe('STARTED');

        tripId = res.body.data.trip._id;
    });

    test('[POST] /api/trips/start - 진행 중인 여행이 있으면 400 반환', async () => {
        // 첫 번째 여행이 아직 진행 중이므로
        const res = await request(app)
            .post('/api/trips/start')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-002' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('진행 중인 여행');
    });

    test('[PATCH] /api/trips/:id/complete - 여행 완료', async () => {
        const res = await request(app)
            .patch(`/api/trips/${tripId}/complete`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                endStationId: 'ST-002',
                distance: 2.5
            });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.trip.status).toBe('COMPLETED');
        expect(res.body.data.trip.distance).toBeDefined();
    });

    test('[POST] /api/trips/start - 미수금(PENDING 결제) 있으면 402 반환', async () => {
        // 미수금 결제 기록 생성
        await Payment.create({
            userId,
            ticketType: 'OVERTIME_FEE',
            amount: 5000,
            paymentType: 'OVERTIME_FEE',
            orderId: 'test-order-' + Date.now(),
            paymentKey: 'test-key-' + Date.now(),
            status: 'PENDING'
        });

        const res = await request(app)
            .post('/api/trips/start')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-001' });

        expect(res.status).toBe(402);
        expect(res.body.message).toContain('미수금');
        expect(res.body.data.pendingAmount).toBeDefined();
    });

    test('[POST] /api/trips/start - 토큰 없이 접근 시 401 반환', async () => {
        const res = await request(app)
            .post('/api/trips/start')
            .send({ startStationId: 'ST-001' });

        expect(res.status).toBe(401);
    });
});
