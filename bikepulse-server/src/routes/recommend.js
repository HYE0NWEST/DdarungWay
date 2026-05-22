const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommendController');

/**
 * @swagger
 * tags:
 *   - name: Recommendations
 *     description: 위치 기반 대여소 추천
 */


/**
 * @swagger
 * /api/recommend:
 *   get:
 *     summary: 반경 내 대여소 추천 (2dsphere 공간 탐색)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *         description: 현재 위도 (예 37.555)
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *         description: 현재 경도 (예 126.910)
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *           default: 500
 *         description: 탐색 반경 (미터 단위, 기본값 500)
 *     responses:
 *       200:
 *         description: 주변 대여소 목록 반환 성공
 */
// GET /api/recommend?lat=37.555&lng=126.910&radius=500
router.get('/', recommendController.getRecommendations);

module.exports = router;