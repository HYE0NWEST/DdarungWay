/**
 * Station 모델 (MongoDB 스키마)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Station:
 *       type: object
 *       properties:
 *         stationId:
 *           type: string
 *           description: 서울시 정류소 고유 ID
 *         name:
 *           type: string
 *           description: 정류소 이름
 *         district:
 *           type: string
 *           description: 자치구
 *         location:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               example: Point
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               example: [126.9780, 37.5665]
 *               description: [경도, 위도]
 *         totalRackCount:
 *           type: number
 *           description: 총 거치대 수
 */

const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema(
    {
        stationId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        name: {
            type: String,
            required: true
        },
        district: String,
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number], // [경도, 위도]
                required: true
            }
        },
        totalRackCount: Number,
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { collection: 'stations' }
);

// Geospatial 인덱스 (반경 검색용)
stationSchema.index({ location: '2dsphere' });

// 정류소명 텍스트 검색 인덱스
stationSchema.index({ name: 'text' });

module.exports = mongoose.model('Station', stationSchema);
