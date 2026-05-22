/**
 * Route Service - TMAP API를 이용한 보행자 경로 조회
 */

const axios = require('axios');
const logger = require('../utils/logger');

class RouteService {
    constructor() {
        this.apiKey = process.env.TMAP_API_KEY;
        this.baseUrl = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1';
    }

    /**
     * 출발지와 도착지 좌표를 받아 보행자 경로(Polyline)를 가져옵니다.
     * @param {number} startX - 출발지 경도 (lng)
     * @param {number} startY - 출발지 위도 (lat)
     * @param {number} endX - 도착지 경도 (lng)
     * @param {number} endY - 도착지 위도 (lat)
     * @returns {Promise<Array>} 좌표 배열 [[lng, lat], ...]
     */
    async getPedestrianRoute(startX, startY, endX, endY) {
        try {
            if (!this.apiKey) {
                logger.warn('[RouteService] TMAP_API_KEY가 설정되지 않았습니다.');
                throw new Error('TMAP API 키가 유효하지 않습니다.');
            }

            logger.info(`[RouteService] TMAP 요청 데이터: ${JSON.stringify({
                startX, startY, endX, endY,
                startName: '출발지',
                endName: '도착지'
            })}`);

            const response = await axios.post(
                this.baseUrl,
                {
                    startX: parseFloat(startX),
                    startY: parseFloat(startY),
                    endX: parseFloat(endX),
                    endY: parseFloat(endY),
                    reqCoordType: 'WGS84GEO',
                    resCoordType: 'WGS84GEO',
                    startName: '출발지',
                    endName: '도착지',
                    searchOption: '0' // 추천 경로
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'appKey': this.apiKey
                    },
                    timeout: 5000
                }
            );

            if (!response.data || !response.data.features) {
                logger.error('[RouteService] TMAP 응답 형식이 올바르지 않음:', response.data);
                throw new Error('경로 데이터를 해석할 수 없습니다.');
            }

            const features = response.data.features;
            let routeCoordinates = [];

            features.forEach(feature => {
                if (feature.geometry && feature.geometry.type === 'LineString') {
                    routeCoordinates = routeCoordinates.concat(feature.geometry.coordinates);
                }
            });

            if (routeCoordinates.length === 0) {
                logger.warn('[RouteService] 추출된 경로 좌표가 없습니다.');
            }

            logger.info(`[RouteService] 경로 조회 성공: ${routeCoordinates.length}개의 포인트 추출`);
            return routeCoordinates;

        } catch (error) {
            const errorDetail = error.response?.data || error.message;
            logger.error('[RouteService] TMAP API 호출 실패:', JSON.stringify(errorDetail));
            throw error;
        }
    }
}

module.exports = new RouteService();
