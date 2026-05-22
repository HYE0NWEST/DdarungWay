const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middlewares/authMiddleware');

// 모든 라우트 보호 (로그인 필수)
router.use(protect);

/**
 * @swagger
 * tags:
 *   - name: Trips
 *     description: 자전거 대여, 반납 및 통계 기록 관리 (로그인 필수)
 */


/**
 * @swagger
 * /api/trips/current:
 *   get:
 *     summary: 현재 진행 중인 여행 조회
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "조회 성공 (여행이 없으면 trip: null)"
 */
router.get('/current', tripController.getCurrentTrip);

/**
 * @swagger
 * /api/trips/start:
 *   post:
 *     summary: 자전거 대여 시작
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startStationId:
 *                 type: string
 *                 example: "ST-103"
 *     responses:
 *       201:
 *         description: 대여 성공
 *       400:
 *         description: 이미 진행 중인 여행이 있음
 */
router.post('/start', tripController.startTrip);

/**
 * @swagger
 * /api/trips/reserve:
 *   post:
 *     summary: 자전거 예약하기 (10분 선점)
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startStationId:
 *                 type: string
 *                 example: "ST-103"
 *     responses:
 *       201:
 *         description: 예약 성공
 *       400:
 *         description: 이미 진행 중인 여행이나 예약이 있음
 */
router.post('/reserve', tripController.reserveTrip);

/**
 * @swagger
 * /api/trips/stats:
 *   get:
 *     summary: 내 여행 누적 통계 및 히스토리 조회
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 통계 정보 조회 성공
 */
router.get('/stats', tripController.getUserStats);

/**
 * @swagger
 * /api/trips/{id}/complete:
 *   patch:
 *     summary: 자전거 반납 처리
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 여행(Trip) 고유 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               endStationId:
 *                 type: string
 *                 example: "ST-205"
 *               distance:
 *                 type: number
 *                 example: 3.5
 *     responses:
 *       200:
 *         description: 반납 성공
 */
router.patch('/:id/complete', tripController.completeTrip);

/**
 * @swagger
 * /api/trips/{id}/cancel:
 *   patch:
 *     summary: 여행 중도 취소
 *     tags: [Trips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 여행(Trip) 고유 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "자전거 고장"
 *     responses:
 *       200:
 *         description: 취소 완료
 */
router.patch('/:id/cancel', tripController.cancelTrip);

module.exports = router;