/**
 * Geospatial Service - 반경 기반 정류소 조회
 * MongoDB 2dsphere 인덱스를 활용한 지정학적 쿼리
 */

const Station = require('../models/Station');
const predictionService = require('./predictionService');
const logger = require('../utils/logger');
const { GEOSPATIAL } = require('../utils/constants');

class GeoService {
    /**
     * 현재 위치 기준 반경 내 정류소 조회
     * @param {number} lng - 경도 (Longitude)
     * @param {number} lat - 위도 (Latitude)
     * @param {number} radius - 반경 (미터, 기본값: 500m)
     * @returns {Promise<Array>} 반경 내 정류소 배열 (거리순)
     */
    async findNearbyStations(lng, lat, radius = GEOSPATIAL.DEFAULT_RADIUS) {
        try {
            if (radius > GEOSPATIAL.MAX_RADIUS) {
                radius = GEOSPATIAL.MAX_RADIUS;
            }

            let stations = await Station.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [lng, lat]
                        },
                        $maxDistance: radius
                    }
                }
            }).limit(50);

            // 🚀 개선: 반경 내에 없으면 가장 가까운 5개라도 가져옴 (사용자 편의성)
            if (stations.length === 0) {
                logger.debug(`[GeoService] 반경 ${radius}m 내 결과 없음 - 가장 가까운 5개 검색`);
                stations = await Station.find({
                    location: {
                        $near: {
                            $geometry: {
                                type: 'Point',
                                coordinates: [lng, lat]
                            }
                        }
                    }
                }).limit(5);
            }

            logger.debug(`[GeoService] 좌표(${lng}, ${lat}) 기준 ${stations.length}개 정류소 발견`);
            return stations;

        } catch (error) {
            logger.error('[GeoService] 반경 검색 실패:', error);
            throw error;
        }
    }

    /**
     * 반경 내 정류소 중 이용 가능성 높은 순으로 추천
     * @param {number} lng - 경도
     * @param {number} lat - 위도
     * @param {number} radius - 반경 (미터)
     * @param {number} topN - 상위 N개 (기본값: 5)
     * @returns {Promise<Array>} 추천 정류소 배열
     */
    async getRecommendationsNearby(lng, lat, radius = GEOSPATIAL.DEFAULT_RADIUS, topN = 30) {
        try {
            // 1. 반경 내 정류소 조회
            const nearbyStations = await this.findNearbyStations(lng, lat, radius);

            if (nearbyStations.length === 0) {
                return [];
            }

            // 2. 각 정류소의 이용 가능성 예측 (전체 정류소에 대해 수행)
            const predictions = await predictionService.calculateBulk(
                nearbyStations.map(s => s.stationId)
            );

            // 3. 정렬: 예측 확률 높은 순 -> 데이터 부족한 것 순
            const recommendations = predictions
                .sort((a, b) => {
                    if (a.predictedAvailability !== null && b.predictedAvailability !== null) {
                        return b.predictedAvailability - a.predictedAvailability;
                    }
                    return a.predictedAvailability === null ? 1 : -1;
                })
                .slice(0, topN);

            return recommendations;

        } catch (error) {
            logger.error('[GeoService] 추천 조회 실패:', error);
            throw error;
        }
    }

    /**
     * 거리 계산 (Haversine 공식)
     * @private
     */
    _calculateDistance(lng1, lat1, lng2, lat2) {
        const R = 6371000; // 지구 반지름 (미터)
        const dLng = this._toRad(lng2 - lng1);
        const dLat = this._toRad(lat2 - lat1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // 미터 단위
    }

    _toRad(deg) {
        return deg * (Math.PI / 180);
    }
}

module.exports = new GeoService();
