/**
 * Route Controller - 경로 관련 요청 처리
 */

const routeService = require('../services/routeService');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * 보행자 경로 조회
 * POST /api/routes/pedestrian
 */
const getPedestrianRoute = async (req, res) => {
    try {
        const { startX, startY, endX, endY } = req.body;

        // 필수 파라미터 체크
        if (!startX || !startY || !endX || !endY) {
            return res.status(400).json({
                success: false,
                message: '출발지와 도착지 좌표(startX, startY, endX, endY)가 필요합니다.'
            });
        }

        logger.info(`[RouteController] 경로 조회 요청: (${startX}, ${startY}) -> (${endX}, ${endY})`);

        const coordinates = await routeService.getPedestrianRoute(startX, startY, endX, endY);

        // 👉 [Redis 캐싱] 클라이언트에게 응답하기 직전에 Redis에 저장합니다.
        try {
            const redisClient = getRedisClient();

            if (redisClient && req.cacheKey) {
                const responsePayload = {
                    success: true,
                    data: { coordinates }
                };

                await redisClient.set(req.cacheKey, JSON.stringify(responsePayload), { EX: 3600 });
                logger.info(`💾 [Redis] 새 경로 데이터 캐싱 완료 (Key: ${req.cacheKey})`);
            }
        } catch (cacheError) {
            logger.warn('Redis 캐시 저장 경고:', cacheError.message);
            // 캐시 실패해도 응답은 계속 진행
        }

        res.json({
            success: true,
            data: {
                coordinates
            }
        });
    } catch (error) {
        logger.error('[RouteController] 경로 조회 중 에러 발생:', error.message);
        res.status(500).json({
            success: false,
            message: '경로 정보를 가져오는 데 실패했습니다.',
            error: error.message
        });
    }
};

module.exports = {
    getPedestrianRoute
};
