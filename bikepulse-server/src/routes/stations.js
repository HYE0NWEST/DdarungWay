/**
 * Station Routes - 정류소 관련 라우팅
 */
const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');

/**
 * @swagger
 * tags:
 *   - name: Stations
 *     description: 정류소 정보 조회
 */


/**
 * @swagger
 * /api/stations:
 *   get:
 *     summary: 전체 정류소 목록 조회
 *     tags: [Stations]
 *     responses:
 *       200:
 *         description: 전체 정류소 목록 반환 성공
 */
// 1️⃣ GET /api/stations - 전체 정류소 목록 조회
router.get('/', stationController.getStations);


/**
 * @swagger
 * /api/stations/{id}:
 *   get:
 *     summary: 특정 정류소 상세 조회
 *     tags: [Stations]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 정류소 고유 ID (예 ST-103)
 *     responses:
 *       200:
 *         description: 정류소 상세 정보 반환
 *       404:
 *         description: 정류소를 찾을 수 없음
 */
// 2️⃣ GET /api/stations/:id - 특정 정류소 상세 조회
router.get('/:id', stationController.getStationById);

module.exports = router;