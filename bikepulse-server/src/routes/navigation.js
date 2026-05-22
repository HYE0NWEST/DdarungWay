/**
 * Route Routes - 경로 관련 라우팅
 */

const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');
const { getRedisClient } = require('../config/redis'); // Redis 클라이언트 가져오기

// 🛡️ Redis 캐시 확인 미들웨어
const checkRouteCache = async (req, res, next) => {
    const { startX, startY, endX, endY } = req.body;
    
    // 좌표가 하나라도 없으면 그냥 통과 (컨트롤러에서 에러 처리하도록)
    if (!startX || !startY || !endX || !endY) {
        return next();
    }

    const cacheKey = `route:${startX},${startY}:${endX},${endY}`;
    const redisClient = getRedisClient(); // 설정에 따라 가져오는 방식이 다를 수 있음 (예: const redisClient = require('../config/redis'))

    try {
        if (redisClient) {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`🚀 [Redis] 캐시 히트! TMAP 호출 생략 (Key: ${cacheKey})`);
                return res.json(JSON.parse(cachedData)); // 캐시가 있으면 여기서 바로 응답 끝!
            }
        }
        
        // 캐시가 없으면 컨트롤러에서 저장할 수 있도록 req 객체에 키를 담아서 넘겨줍니다.
        req.cacheKey = cacheKey;
        next(); // 컨트롤러(routeController.getPedestrianRoute)로 이동
        
    } catch (error) {
        console.error('Redis 캐시 조회 에러:', error);
        next(); // 에러가 나도 서비스는 멈추면 안 되므로 다음으로 넘김
    }
};

/**
 * @swagger
 * tags:
 *   - name: Routing
 *     description: TMAP 연동 및 보행자 경로 안내
 */


/**
 * @swagger
 * /api/routes/pedestrian:
 *   post:
 *     summary: 보행자 경로 조회 (Redis 캐시 적용)
 *     tags: [Routing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startX:
 *                 type: number
 *                 description: 출발지 경도
 *                 example: 126.910
 *               startY:
 *                 type: number
 *                 description: 출발지 위도
 *                 example: 37.555
 *               endX:
 *                 type: number
 *                 description: 도착지 경도
 *                 example: 126.915
 *               endY:
 *                 type: number
 *                 description: 도착지 위도
 *                 example: 37.560
 *     responses:
 *       200:
 *         description: TMAP 경로 데이터 (캐시된 경우 즉시 반환)
 */
// POST /api/routes/pedestrian - 보행자 경로 조회 (미들웨어 장착!)
router.post('/pedestrian', checkRouteCache, routeController.getPedestrianRoute);

module.exports = router;