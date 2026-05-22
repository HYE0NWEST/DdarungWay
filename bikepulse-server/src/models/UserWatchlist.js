/**
 * UserWatchlist 모델 - 사용자 관심 정류소
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserWatchlist:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           description: 사용자 고유 ID
 *         stationId:
 *           type: string
 *           description: 모니터링 대상 정류소 ID
 *         stationName:
 *           type: string
 *           description: 정류소 이름
 *         active:
 *           type: boolean
 *           description: 알림 활성화 여부
 */

const mongoose = require('mongoose');

const userWatchlistSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true
        },
        stationId: {
            type: String,
            required: true,
            index: true
        },
        stationName: String,
        active: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { collection: 'userWatchlists' }
);

// 사용자별 관심 정류소 조회 최적화
userWatchlistSchema.index({ userId: 1, active: 1 });

// 정류소별 모니터링 사용자 조회 최적화
userWatchlistSchema.index({ stationId: 1, active: 1 });

module.exports = mongoose.model('UserWatchlist', userWatchlistSchema);
