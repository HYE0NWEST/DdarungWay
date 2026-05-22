const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 현재 사용자 프로필 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 반환
 */
// GET /api/users/profile - 프로필 조회
router.get('/profile', protect, userController.getUserProfile);

/**
 * @swagger
 * /api/users/profile:
 *   patch:
 *     summary: 현재 사용자 프로필 수정 (닉네임 등)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "뉴라이더"
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 */
// PATCH /api/users/profile - 프로필 수정
router.patch('/profile', protect, userController.updateUserProfile);

/**
 * @swagger
 * /api/users/password:
 *   patch:
 *     summary: 비밀번호 변경
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 */
// PATCH /api/users/password - 비밀번호 변경
router.patch('/password', protect, userController.updatePassword);


/**
 * @swagger
 * /api/users/watchlist:
 *   post:
 *     summary: 관심 정류소 등록 및 해제 (토글)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stationId:
 *                 type: string
 *                 example: "ST-103"
 *               stationName:
 *                 type: string
 *                 example: "신도림역 1번 출구"
 *     responses:
 *       200:
 *         description: 관심 정류소 상태 변경 성공
 *       201:
 *         description: 신규 관심 정류소 등록 성공
 */
// POST /api/users/watchlist - 관심 정류소 등록 (✅ protect 미들웨어)
router.post('/watchlist', protect, userController.toggleWatchlist);


/**
 * @swagger
 * /api/users/watchlist:
 *   get:
 *     summary: 내 관심 정류소 목록 조회
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 관심 정류소 목록 반환 성공
 */
// GET /api/users/watchlist - 관심 목록 조회 (✅ protect 미들웨어)
router.get('/watchlist', protect, userController.getWatchlist);

module.exports = router;