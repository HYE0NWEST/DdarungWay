/**
 * 인증 라우트
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: 사용자 인증 및 토큰 관리
 *     
 */

/**
 * @swagger
 * /api/auth/send-code:
 *   post:
 *     summary: 인증번호 이메일 발송
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: 인증번호 발송 성공
 *       400:
 *         description: 잘못된 요청
 */
router.post('/send-code', authController.sendVerificationCode);

/**
 * @swagger
 * /api/auth/verify-code:
 *   post:
 *     summary: 인증번호 확인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 인증 성공
 *       400:
 *         description: 인증 실패 (만료 또는 불일치)
 */
router.post('/verify-code', authController.verifyCode);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 비밀번호 찾기 (임시 비밀번호 발급)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *     responses:
 *       200:
 *         description: 임시 비밀번호 발송 성공
 *       404:
 *         description: 가입되지 않은 이메일
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@bikepulse.com
 *               password:
 *                 type: string
 *                 example: secret123!
 *               username:
 *                 type: string
 *                 example: 자전거매니아
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       400:
 *         description: 이미 사용 중인 이메일
 */
// POST /api/auth/signup - 회원가입
router.post('/signup', authController.signup);

/**
 * @swagger
 * /api/auth/kakao:
 *   get:
 *     summary: 카카오 OAuth 로그인 리다이렉트
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: 카카오 로그인 페이지로 리다이렉트
 *   post:
 *     summary: 카카오 OAuth 로그인 처리
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "authorization_code_from_kakao"
 *     responses:
 *       200:
 *         description: 로그인 성공
 */
router.get('/kakao', authController.redirectToKakao);
router.get('/kakao/callback', authController.kakaoLoginCallback);
router.post('/kakao', authController.kakaoLogin);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: 구글 OAuth 로그인 리다이렉트
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: 구글 로그인 페이지로 리다이렉트
 *   post:
 *     summary: 구글 OAuth 로그인 처리
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "authorization_code_from_google"
 *     responses:
 *       200:
 *         description: 로그인 성공
 */
router.get('/google', authController.redirectToGoogle);
router.get('/google/callback', authController.googleLoginCallback);
router.post('/google', authController.googleLogin);


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 로그인 (Access / Refresh 토큰 발급)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: test@bikepulse.com
 *               password:
 *                 type: string
 *                 example: secret123!
 *     responses:
 *       200:
 *         description: 로그인 성공 및 토큰 반환
 *       401:
 *         description: 이메일 또는 비밀번호 불일치
 */
// POST /api/auth/login - 로그인
router.post('/login', authController.login);


/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Access Token 재발급
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: 새로운 Access Token 발급 성공
 *       401:
 *         description: 유효하지 않거나 만료된 Refresh Token
 */
// 🆕 새로 추가된 라우트 (✅ protect 미들웨어로 JWT 검증)
router.post('/refresh', authController.refresh); // Access Token 재발급

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 로그아웃 (Redis에서 Refresh Token 삭제)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 */
router.post('/logout', protect, authController.logout);   // 로그아웃 (JWT 필수)

module.exports = router;
