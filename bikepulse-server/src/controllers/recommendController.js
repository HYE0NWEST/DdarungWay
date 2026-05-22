/**
 * Recommend Controller - 반경 기반 추천 엔진
 */
const geoService = require('../services/geoService');
const logger = require('../utils/logger');

const getRecommendations = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;

        // 필수 파라미터 검증
        if (!lat || !lng) {
            return res.status(400).json({ 
                success: false, 
                message: '위도(lat)와 경도(lng) 파라미터가 필수입니다.' 
            });
        }

        const radiusNum = radius ? parseInt(radius, 10) : 500;
        logger.info(`[Recommend] 추천 요청: 위도 ${lat}, 경도 ${lng}, 반경 ${radiusNum}m`);

        // GeoService 호출 (MongoDB는 lng, lat 순서임을 주의!)
        const recommendations = await geoService.getRecommendationsNearby(
            parseFloat(lng), 
            parseFloat(lat), 
            radiusNum
        );

        res.json({
            success: true,
            count: recommendations.length,
            data: recommendations
        });

    } catch (error) {
        logger.error('[RecommendController] 추천 조회 실패:', error.message);
        res.status(500).json({ success: false, message: '추천 데이터를 가져오는 데 실패했습니다.' });
    }
};

module.exports = { getRecommendations };