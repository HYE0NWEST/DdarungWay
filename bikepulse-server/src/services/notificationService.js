const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
    /**
     * 자전거 입고 변화가 감지되었을 때 SSE 구독자들에게 알림을 쏩니다.
     * (기존 스나이핑 기능 유지 및 DB 저장 로직 추가 가능)
     */
    async notifyWatchers(stationId, changeData) {
        try {
            if (global.snipers && global.snipers[stationId] && global.snipers[stationId].length > 0) {
                const clients = global.snipers[stationId];
                const messagePayload = {
                    stationId: stationId,
                    type: 'SNIPING',
                    title: '🚲 자전거 입고 알림',
                    message: `📥 [${changeData.stationName || stationId}] 자전거가 입고되었습니다! (현재: ${changeData.bikeCount}대)`,
                    data: changeData
                };

                clients.forEach(client => {
                    client.write(`event: station_updated\n`);
                    client.write(`data: ${JSON.stringify(messagePayload)}\n\n`);
                });

                if (global.snipers['global']) {
                    global.snipers['global'].forEach(client => {
                        client.write(`event: station_updated\n`);
                        client.write(`data: ${JSON.stringify(messagePayload)}\n\n`);
                    });
                }

                // [추가] 해당 정류소를 관심 등록한 유저들의 DB에도 알림 저장 (필요시)
                // 이 로직은 UserWatchlist 모델과 연계하여 특정 유저들에게만 보낼 때 유용함
            }
        } catch (error) {
            logger.error(`[Notification] 알림 발송 중 에러:`, error);
        }
    }

    /**
     * 특정 사용자에게 직접 알림을 전송하고 DB에 저장합니다.
     */
    async sendDirectNotification(userId, { type, title, message, data = {} }) {
        try {
            // 1. 유저 설정 및 DND 확인
            const user = await User.findById(userId);
            if (!user) return;

            const settings = user.notificationSettings;
            
            // 카테고리별 수신 여부 확인
            const categoryMap = {
                'SNIPING': 'sniping',
                'TRIP': 'trip',
                'PAYMENT': 'trip',
                'MARKETING': 'marketing'
            };
            const settingKey = categoryMap[type];
            if (settingKey && !settings[settingKey]) {
                logger.info(`[Notification] 사용자 ${userId}가 ${type} 알림 수신을 거부함`);
                return;
            }

            // 방해 금지 모드(DND) 확인
            if (settings.dnd && settings.dnd.enabled) {
                const now = new Date();
                const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                
                if (this._isWithinTimeRange(currentTime, settings.dnd.startTime, settings.dnd.endTime)) {
                    logger.info(`[Notification] 사용자 ${userId} 방해 금지 모드 중`);
                    return;
                }
            }

            // 2. DB 저장
            const notification = await Notification.create({
                userId,
                type,
                title,
                message,
                data
            });

            // 3. 실시간 SSE 전송
            if (global.userConnections && global.userConnections[userId]) {
                const payload = {
                    id: notification._id,
                    type,
                    title,
                    message,
                    data,
                    createdAt: notification.createdAt
                };

                global.userConnections[userId].forEach(client => {
                    client.write(`event: personal_notification\n`);
                    client.write(`data: ${JSON.stringify(payload)}\n\n`);
                });
            }

            logger.info(`[Notification] 사용자 ${userId}에게 알림 전송 완료 (${type})`);
        } catch (error) {
            logger.error(`[Notification] Direct 알림 전송 에러:`, error);
        }
    }

    /**
     * 현재 시간이 DND 범위 내에 있는지 확인
     */
    _isWithinTimeRange(current, start, end) {
        if (start <= end) {
            return current >= start && current <= end;
        } else {
            // 자정을 넘기는 경우 (예: 23:00 ~ 07:00)
            return current >= start || current <= end;
        }
    }
}

module.exports = new NotificationService();