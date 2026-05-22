/**
 * 예약(Reservation) 관련 테스트
 */
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Trip = require('../src/models/Trip');
const Station = require('../src/models/Station');
const { getRedisClient } = require('../src/config/redis');
const { TRIP_STATUS } = require('../src/utils/constants');

describe('Reservation API Tests', () => {
    let userToken;
    let userId;
    let tripId;

    beforeAll(async () => {
        const user = await User.create({
            email: 'reserver@test.com',
            password: 'pass123',
            username: 'reserver'
        });
        userId = user._id.toString();

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'reserver@test.com', password: 'pass123' });
        userToken = res.body.accessToken;

        await Station.create([
            { stationId: 'ST-RES-001', name: '예약 테스트 정류소 1', location: { coordinates: [126.9, 37.5] } }
        ]);

        const redis = getRedisClient();
        await redis.set('station:ST-RES-001', '5');
    });

    afterAll(async () => {
        await User.deleteOne({ email: 'reserver@test.com' });
        await Trip.deleteMany({ userId });
        await Station.deleteMany({ stationId: 'ST-RES-001' });
    });

    test('[POST] /api/trips/reserve - 자전거 예약 성공', async () => {
        const res = await request(app)
            .post('/api/trips/reserve')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-RES-001' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.trip.status).toBe(TRIP_STATUS.RESERVED);
        expect(res.body.data.trip.reservationExpiresAt).toBeDefined();

        tripId = res.body.data.trip._id;
    });

    test('[POST] /api/trips/reserve - 이미 예약이 있으면 400 반환', async () => {
        const res = await request(app)
            .post('/api/trips/reserve')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-RES-001' });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain('이미 예약된 내역');
    });

    test('[POST] /api/trips/start - 예약 상태에서 대여 시작 (상태 전환)', async () => {
        const res = await request(app)
            .post('/api/trips/start')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-RES-001' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.trip.status).toBe(TRIP_STATUS.STARTED);
        expect(res.body.data.trip._id).toBe(tripId);
    });

    test('[POST] /api/trips/cancel - 예약된 내역 취소 테스트를 위해 새로운 예약 생성', async () => {
        // 이전 여행 종료 (CANCELLED 처리)
        await Trip.findByIdAndUpdate(tripId, { status: TRIP_STATUS.CANCELLED });

        const res = await request(app)
            .post('/api/trips/reserve')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ startStationId: 'ST-RES-001' });

        expect(res.status).toBe(201);
        const newTripId = res.body.data.trip._id;

        const cancelRes = await request(app)
            .patch(`/api/trips/${newTripId}/cancel`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({ reason: '테스트 취소' });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.data.trip.status).toBe(TRIP_STATUS.CANCELLED);
    });
});
