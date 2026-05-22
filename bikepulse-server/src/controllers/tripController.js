const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Station = require('../models/Station');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');
const { TRIP_STATUS } = require('../utils/constants');

// 탄소 감축량 상수 (보통 자전거 1km당 0.232kg 감축으로 계산)
const CARBON_COEFFICIENT = 0.232;

/**
 * 1. 자전거 예약 (10분 선점) - 신규 추가
 */
exports.reserveTrip = async (req, res) => {
    const { startStationId } = req.body;
    const userId = req.user.id;
    const redisClient = getRedisClient();

    try {
        // 1. 미수금 확인
        const pendingPayment = await Payment.findOne({
            userId,
            status: 'PENDING',
            paymentType: 'OVERTIME_FEE'
        });

        if (pendingPayment) {
            return res.status(402).json({
                status: 'fail',
                message: '이전 이용에 대한 미수금이 있습니다. 결제 후 예약이 가능합니다.',
                data: { pendingAmount: pendingPayment.amount, orderId: pendingPayment.orderId }
            });
        }

        // 2. 이미 진행 중인 여행이나 예약이 있는지 확인
        const activeTrip = await Trip.findOne({ 
            userId, 
            status: { $in: [TRIP_STATUS.RESERVED, TRIP_STATUS.STARTED, TRIP_STATUS.IN_PROGRESS] } 
        });

        if (activeTrip) {
            const msg = activeTrip.status === TRIP_STATUS.RESERVED ? '이미 예약된 내역이 있습니다.' : '이미 이용 중인 자전거가 있습니다.';
            return res.status(400).json({ status: 'fail', message: msg });
        }

        // 3. 정류소 정보 및 실제 자전거 수 확인
        const station = await Station.findOne({ stationId: startStationId });
        if (!station) {
            return res.status(404).json({ status: 'fail', message: '존재하지 않는 정류소입니다.' });
        }

        const bikeCountStr = await redisClient.get(`station:${startStationId}`);
        const currentBikeCount = bikeCountStr ? parseInt(bikeCountStr) : 0;

        // 4. 가상 예약 수 확인 (현재 예약 중인 다른 유저들)
        const activeReservations = await Trip.countDocuments({
            startStationId,
            status: TRIP_STATUS.RESERVED,
            reservationExpiresAt: { $gt: new Date() }
        });

        if (currentBikeCount - activeReservations <= 0) {
            return res.status(400).json({ status: 'fail', message: '현재 예약 가능한 자전거가 없습니다.' });
        }

        // 5. 예약 생성 (10분 유효)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const newTrip = await Trip.create({
            userId,
            startStationId: station.stationId,
            startStationName: station.name,
            status: TRIP_STATUS.RESERVED,
            reservationExpiresAt: expiresAt
        });

        // 6. Redis에 가상 예약 락 설정 (선택 사항, 만료 시간과 동기화)
        await redisClient.set(`reserve_lock:${startStationId}:${userId}`, 'true', { EX: 600 });

        // [알림] 예약 완료 알림
        await notificationService.sendDirectNotification(userId, {
            type: 'TRIP',
            title: '📅 예약 완료',
            message: `[${station.name}]에서 자전거가 예약되었습니다. 10분 내에 방문하여 대여를 시작해 주세요.`,
            data: { tripId: newTrip._id, expiresAt }
        });

        res.status(201).json({ status: 'success', data: { trip: newTrip } });
    } catch (error) {
        logger.error('Reserve Trip Error:', error);
        res.status(500).json({ status: 'error', message: '예약 처리에 실패했습니다.' });
    }
};

/**
 * 2. 여행/대여 시작
 */
exports.startTrip = async (req, res) => {
    const { startStationId } = req.body;
    const userId = req.user.id;
    const redisClient = getRedisClient();

    try {
        // 1. 미수금 확인 (기존 로직)
        const pendingPayment = await Payment.findOne({
            userId,
            status: 'PENDING',
            paymentType: 'OVERTIME_FEE'
        });

        if (pendingPayment) {
            return res.status(402).json({
                status: 'fail',
                message: '이전 이용에 대한 미수금이 있습니다. 결제 후 대여가 가능합니다.',
                data: { pendingAmount: pendingPayment.amount, orderId: pendingPayment.orderId }
            });
        }

        // 2. 기존 예약 내역이 있는지 확인
        let trip = await Trip.findOne({ 
            userId, 
            status: TRIP_STATUS.RESERVED,
            reservationExpiresAt: { $gt: new Date() }
        });

        if (trip) {
            // 예약된 자전거 대여 시작
            trip.status = TRIP_STATUS.STARTED;
            trip.startTime = new Date();
            await trip.save();
            
            // Redis 예약 락 해제
            await redisClient.del(`reserve_lock:${trip.startStationId}:${userId}`);

            await notificationService.sendDirectNotification(userId, {
                type: 'TRIP',
                title: '🚲 대여 시작 (예약 전환)',
                message: `예약하신 자전거 대여를 시작합니다. 안전하게 운행하세요!`,
                data: { tripId: trip._id }
            });

            return res.status(200).json({ status: 'success', data: { trip } });
        }

        // 3. 예약 없이 바로 대여하는 경우
        const activeTrip = await Trip.findOne({ userId, status: { $in: [TRIP_STATUS.STARTED, TRIP_STATUS.IN_PROGRESS] } });
        if (activeTrip) {
            return res.status(400).json({ status: 'fail', message: '이미 진행 중인 여행이 있습니다.' });
        }

        const lockKey = `lock:station:${startStationId}`;
        const lock = await redisClient.set(lockKey, userId, { NX: true, PX: 3000 });
        if (!lock) {
            return res.status(409).json({ status: 'fail', message: '현재 다른 사용자가 대여를 진행 중입니다.' });
        }

        const station = await Station.findOne({ stationId: startStationId });
        if (!station) {
            await redisClient.del(lockKey);
            return res.status(404).json({ status: 'fail', message: '존재하지 않는 정류소입니다.' });
        }

        // 추가: 즉시 대여 시에도 자전거 수량 확인
        const bikeCountStr = await redisClient.get(`station:${startStationId}`);
        const currentBikeCount = bikeCountStr ? parseInt(bikeCountStr) : 0;

        const activeReservations = await Trip.countDocuments({
            startStationId,
            status: TRIP_STATUS.RESERVED,
            reservationExpiresAt: { $gt: new Date() }
        });

        if (currentBikeCount - activeReservations <= 0) {
            await redisClient.del(lockKey);
            return res.status(400).json({ status: 'fail', message: '현재 대여 가능한 자전거가 없습니다.' });
        }

        const newTrip = await Trip.create({
            userId,
            startStationId: station.stationId,
            startStationName: station.name,
            status: TRIP_STATUS.STARTED,
            startTime: new Date()
        });

        await notificationService.sendDirectNotification(userId, {
            type: 'TRIP',
            title: '🚲 대여 시작',
            message: `[${station.name}]에서 자전거 대여를 시작했습니다.`,
            data: { tripId: newTrip._id }
        });

        await redisClient.del(lockKey);
        res.status(201).json({ status: 'success', data: { trip: newTrip } });
    } catch (error) {
        logger.error('Start Trip Error:', error);
        res.status(500).json({ status: 'error', message: '대여 처리에 실패했습니다.' });
    }
};

/**
 * 3. 여행 완료
 */
exports.completeTrip = async (req, res) => {
    try {
        const { endStationId, distance } = req.body;
        const tripId = req.params.id;

        const trip = await Trip.findById(tripId);
        if (!trip || trip.status === TRIP_STATUS.COMPLETED || trip.status === TRIP_STATUS.CANCELLED) {
            return res.status(404).json({ status: 'fail', message: '유효하지 않은 여행 기록입니다.' });
        }

        const user = await User.findById(trip.userId);
        const endTime = new Date();
        const duration = Math.round((endTime - trip.startTime) / (1000 * 60));

        let overtimeFee = 0;
        let isOvertime = false;

        if (user && user.passBaseMinutes > 0 && duration > user.passBaseMinutes) {
            const extraMinutes = duration - user.passBaseMinutes;
            overtimeFee = Math.ceil(extraMinutes / 5) * 200;
            isOvertime = true;
        }

        const station = await Station.findOne({ stationId: endStationId });
        const endStationName = station ? station.name : '알 수 없는 정류소';

        trip.endStationId = endStationId;
        trip.endStationName = endStationName;
        trip.endTime = endTime;
        trip.distance = distance;
        trip.duration = duration;
        trip.status = TRIP_STATUS.COMPLETED;
        await trip.save();

        // [알림] 반납 완료 알림 전송
        await notificationService.sendDirectNotification(trip.userId, {
            type: 'TRIP',
            title: '🔒 반납 완료',
            message: `[${endStationName}] 정류소에 반납되었습니다. 총 ${duration}분 이용하셨습니다.`,
            data: { tripId: trip._id }
        });

        if (isOvertime) {
            await Payment.create({
                userId: user._id,
                ticketType: 'OVERTIME_FEE',
                amount: overtimeFee,
                paymentType: 'OVERTIME_FEE',
                paymentMethod: 'TOSS_WIDGET',
                orderId: `over_${trip._id}_${Date.now()}`,
                status: 'PENDING'
            });
        }

        res.status(200).json({ status: 'success', data: { trip } });
    } catch (error) {
        logger.error('Complete Trip Error:', error);
        res.status(500).json({ status: 'error', message: '반납 처리에 실패했습니다.' });
    }
};

/**
 * 4. 여행 취소
 */
exports.cancelTrip = async (req, res) => {
    try {
        const { reason } = req.body;
        const tripId = req.params.id;
        const userId = req.user.id;
        const redisClient = getRedisClient();

        const trip = await Trip.findOne({ _id: tripId, userId });

        if (!trip) {
            return res.status(404).json({ status: 'fail', message: '여행 기록을 찾을 수 없습니다.' });
        }

        if ([TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(trip.status)) {
            return res.status(400).json({ status: 'fail', message: '이미 종료되거나 취소된 내역입니다.' });
        }

        // 예약 취소인 경우 Redis 락도 해제
        if (trip.status === TRIP_STATUS.RESERVED) {
            await redisClient.del(`reserve_lock:${trip.startStationId}:${userId}`);
        }

        trip.status = TRIP_STATUS.CANCELLED;
        trip.cancellationReason = reason || '사용자 변심';
        trip.endTime = new Date();
        await trip.save();

        res.status(200).json({ status: 'success', data: { trip } });
    } catch (error) {
        logger.error('Cancel Trip Error:', error);
        res.status(500).json({ status: 'error', message: '취소 처리에 실패했습니다.' });
    }
};

/**
 * 5. 현재 진행 중인 여행/예약 조회
 */
exports.getCurrentTrip = async (req, res) => {
    try {
        const userId = req.user.id;
        const trip = await Trip.findOne({ 
            userId, 
            status: { $in: [TRIP_STATUS.RESERVED, TRIP_STATUS.STARTED, TRIP_STATUS.IN_PROGRESS] } 
        }).sort({ createdAt: -1 });

        // 만료된 예약 필터링 (조회 시점에 체크)
        if (trip && trip.status === TRIP_STATUS.RESERVED && trip.reservationExpiresAt < new Date()) {
            trip.status = TRIP_STATUS.CANCELLED;
            trip.cancellationReason = '예약 시간 만료';
            await trip.save();
            return res.status(200).json({ status: 'success', data: { trip: null } });
        }

        res.status(200).json({
            status: 'success',
            data: { trip }
        });
    } catch (error) {
        logger.error('Get Current Trip Error:', error);
        res.status(500).json({ status: 'error', message: '이용 정보를 불러올 수 없습니다.' });
    }
};

/**
 * 6. 내 여행 통계
 */
exports.getUserStats = async (req, res) => {
    try {
        const userId = req.user.id;
        const userObjectId = new mongoose.Types.ObjectId(userId);

        const history = await Trip.find({ userId, status: { $ne: TRIP_STATUS.RESERVED } })
            .sort({ createdAt: -1 })
            .limit(10);

        const statsAggregation = await Trip.aggregate([
            { $match: { userId: userObjectId, status: TRIP_STATUS.COMPLETED } },
            {
                $group: {
                    _id: null,
                    totalTrips: { $sum: 1 },
                    totalDistance: { $sum: '$distance' },
                    totalDuration: { $sum: '$duration' },
                    totalCarbonReduction: { $sum: { $multiply: ['$distance', CARBON_COEFFICIENT] } }
                }
            }
        ]);

        const favoriteStations = await Trip.aggregate([
            { $match: { userId: userObjectId, status: TRIP_STATUS.COMPLETED } },
            { $group: { _id: '$startStationName', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);

        const stats = statsAggregation.length > 0 ? statsAggregation[0] : null;
        
        const userStats = {
            totalTrips: stats?.totalTrips || 0,
            totalDistance: parseFloat((stats?.totalDistance || 0).toFixed(1)),
            totalDuration: stats?.totalDuration || 0,
            totalCarbonReduction: parseFloat((stats?.totalCarbonReduction || 0).toFixed(3)),
            favoriteStation: favoriteStations.length > 0 ? favoriteStations[0]._id : '데이터 없음'
        };

        res.status(200).json({
            status: 'success',
            data: { stats: userStats, history }
        });
    } catch (error) {
        logger.error('Get Stats Error:', error);
        res.status(500).json({ status: 'error', message: '통계 정보를 불러오지 못했습니다.' });
    }
};