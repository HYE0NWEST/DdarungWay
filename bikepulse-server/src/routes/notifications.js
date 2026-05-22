const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: 실시간 알림 (SSE) 및 알림 관리
 */

/**
 * 실시간 SSE 구독 (로그인 필요 없음/있음)
 */
router.get('/sniping/:stationId', notificationController.subscribeStation);
router.get('/global', notificationController.subscribeGlobal);
router.get('/subscribe', protect, notificationController.subscribeUser);

/**
 * 알림 내역 관리
 */
router.get('/', protect, notificationController.getNotifications);
router.patch('/:id/read', protect, notificationController.markAsRead);
router.post('/read-all', protect, notificationController.markAllAsRead);

/**
 * 알림 설정
 */
router.get('/settings', protect, notificationController.getSettings);
router.put('/settings', protect, notificationController.updateSettings);

module.exports = router;
