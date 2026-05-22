/**
 * StationLog 모델 (변화 히스토리)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StationLog:
 *       type: object
 *       properties:
 *         stationId:
 *           type: string
 *         oldCount:
 *           type: number
 *         newCount:
 *           type: number
 *         delta:
 *           type: number
 *           description: 변화량 (예 -1, +2)
 *         changeType:
 *           type: string
 *           enum: [RENTAL, RETURN]
 *           description: 대여인지 반납인지
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 로그 기록 시간 (1시간 뒤 자동 삭제)
 */

const mongoose = require('mongoose');

const stationLogSchema = new mongoose.Schema(
    {
        stationId: {
            type: String,
            required: true,
            index: true
        },
        oldCount: Number,
        newCount: Number,
        delta: Number,
        changeType: {
            type: String,
            enum: ['RENTAL', 'RETURN'],
            required: true
        },
        timestamp: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    { collection: 'stationLogs' }
);

// TTL 인덱스 (1시간 후 자동 삭제)
stationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 });

// 정류소별 최근 데이터 조회 최적화
stationLogSchema.index({ stationId: 1, createdAt: -1 });

module.exports = mongoose.model('StationLog', stationLogSchema);
