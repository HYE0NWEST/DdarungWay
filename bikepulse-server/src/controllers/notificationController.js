const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * 특정 정류소 빈 자리 입고 알림 구독 (SSE)
 */
exports.subscribeStation = (req, res) => {
    const { stationId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!global.snipers) global.snipers = {};
    if (!global.snipers[stationId]) global.snipers[stationId] = [];
    
    global.snipers[stationId].push(res);

    logger.info(`[Notification] 정류소 ${stationId} SSE 구독 시작`);

    req.on('close', () => {
        if (global.snipers[stationId]) {
            global.snipers[stationId] = global.snipers[stationId].filter(client => client !== res);
        }
    });
};

/**
 * 사용자별 개인 알림 채널 구독 (SSE)
 * 로그인한 유저만 접근 가능
 */
exports.subscribeUser = (req, res) => {
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!global.userConnections) global.userConnections = {};
    
    // 한 명의 유저가 여러 기기에서 접속할 수 있으므로 배열로 관리
    if (!global.userConnections[userId]) global.userConnections[userId] = [];
    global.userConnections[userId].push(res);

    logger.info(`[Notification] 사용자 ${userId} 개인 SSE 채널 연결`);

    req.on('close', () => {
        if (global.userConnections[userId]) {
            global.userConnections[userId] = global.userConnections[userId].filter(client => client !== res);
            if (global.userConnections[userId].length === 0) delete global.userConnections[userId];
        }
    });
};

/**
 * 전역 알림 구독 (SSE)
 */
exports.subscribeGlobal = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (!global.snipers) global.snipers = {};
    if (!global.snipers['global']) global.snipers['global'] = [];
    
    global.snipers['global'].push(res);

    logger.info('[Notification] 전역 SSE 구독 시작');

    req.on('close', () => {
        if (global.snipers['global']) {
            global.snipers['global'] = global.snipers['global'].filter(client => client !== res);
        }
    });
};

/**
 * 알림 내역 조회
 */
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(50);
        
        res.json({ success: true, data: notifications });
    } catch (error) {
        logger.error('알림 조회 중 에러:', error);
        res.status(500).json({ success: false, message: '알림을 불러오는데 실패했습니다.' });
    }
};

/**
 * 알림 읽음 처리
 */
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: '알림을 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        logger.error('알림 읽음 처리 중 에러:', error);
        res.status(500).json({ success: false, message: '처리에 실패했습니다.' });
    }
};

/**
 * 모든 알림 읽음 처리
 */
exports.markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        await Notification.updateMany({ userId, isRead: false }, { isRead: true });
        res.json({ success: true, message: '모든 알림이 읽음 처리되었습니다.' });
    } catch (error) {
        logger.error('모든 알림 읽음 처리 중 에러:', error);
        res.status(500).json({ success: false, message: '처리에 실패했습니다.' });
    }
};

/**
 * 알림 설정 조회
 */
exports.getSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('notificationSettings');
        res.json({ success: true, data: user.notificationSettings });
    } catch (error) {
        res.status(500).json({ success: false, message: '설정을 불러오는데 실패했습니다.' });
    }
};

/**
 * 알림 설정 업데이트
 */
exports.updateSettings = async (req, res) => {
    try {
        const { notificationSettings } = req.body;
        await User.findByIdAndUpdate(req.user.id, { notificationSettings });
        res.json({ success: true, message: '알림 설정이 저장되었습니다.' });
    } catch (error) {
        res.status(500).json({ success: false, message: '설정 저장에 실패했습니다.' });
    }
};
