const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { protect } = require('../middlewares/authMiddleware');

// 모든 문의 라우트는 로그인이 필요함
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Inquiries
 *   description: 1:1 문의 관리
 */

/**
 * @swagger
 * /api/inquiries:
 *   post:
 *     summary: 1:1 문의 접수
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [account, payment, trip, bug, other]
 *     responses:
 *       201:
 *         description: 문의 접수 성공
 *   get:
 *     summary: 나의 문의 내역 조회
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 조회 성공
 */
router.post('/', inquiryController.createInquiry);
router.get('/', inquiryController.getMyInquiries);

/**
 * @swagger
 * /api/inquiries/{id}:
 *   get:
 *     summary: 문의 상세 조회
 *     tags: [Inquiries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 조회 성공
 *       404:
 *         description: 문의를 찾을 수 없음
 */
router.get('/:id', inquiryController.getInquiryDetail);

module.exports = router;
