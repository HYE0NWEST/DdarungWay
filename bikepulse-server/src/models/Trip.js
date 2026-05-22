/**
 * Trip 모델 (MongoDB 스키마)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Trip:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: 여행 기록 고유 ID
 *         userId:
 *           type: string
 *           description: 대여자(사용자) ID
 *         startStationId:
 *           type: string
 *           description: 대여 시작 정류소 ID
 *         endStationId:
 *           type: string
 *           description: 반납 정류소 ID
 *         status:
 *           type: string
 *           enum: [STARTED, IN_PROGRESS, COMPLETED, CANCELLED]
 *           description: 현재 여행 상태
 *         distance:
 *           type: number
 *           description: 이동 거리 (km)
 *         duration:
 *           type: number
 *           description: 소요 시간 (분)
 *         cancellationReason:
 *           type: string
 *           description: 취소 사유 (취소 시에만 존재)
 */

const mongoose = require('mongoose');
const { TRIP_STATUS } = require('../utils/constants');

const tripSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        startStationId: {
            type: String, // 서울시 정류소 ID (예: "00103")
            required: true
        },
        startStationName: {
            type: String,
            required: true
        },
        endStationId: {
            type: String // 반납 시 업데이트
        },
        endStationName: {
            type: String
        },
        startTime: {
            type: Date,
            default: Date.now
        },
        endTime: {
            type: Date
        },
        reservationExpiresAt: {
            type: Date // 예약인 경우 만료 시간 (예: 대여 시작 전 10분)
        },
        status: {
            type: String,
            enum: Object.values(TRIP_STATUS),
            default: TRIP_STATUS.STARTED
        },
        distance: {
            type: Number, // 이동 거리 (km)
            default: 0
        },
        duration: {
            type: Number, // 소요 시간 (분)
            default: 0
        },
        cancellationReason: {
            type: String
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);