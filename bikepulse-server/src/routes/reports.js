const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');

// 모든 라우트 보호
router.use(protect);

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: 고장 신고 제출
 *     tags: [Reports]
 */
router.post('/', reportController.createReport);

/**
 * @swagger
 * /api/reports/me:
 *   get:
 *     summary: 나의 고장 신고 내역 조회
 *     tags: [Reports]
 */
router.get('/me', reportController.getMyReports);

module.exports = router;
