const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

/**
 * @swagger
 * tags:
 *   - name: Payments
 *     description: 토스페이먼츠 결제 연동 및 내역 관리
 */

/**
 * @swagger
 * /api/payments/confirm:
 *   post:
 *     summary: 토스 결제 최종 승인 및 이용권 발급
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentKey:
 *                 type: string
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               ticketType:
 *                 type: string
 *                 example: "DAILY_1H"
 *     responses:
 *       200:
 *         description: 결제 승인 및 발급 성공
 */
router.post('/confirm', paymentController.confirmPayment);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: 내 결제 내역 조회
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 결제 내역 반환
 */
router.get('/history', paymentController.getPaymentHistory);

module.exports = router;