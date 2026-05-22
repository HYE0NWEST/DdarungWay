/**
 * Prediction Service - 이용 가능성 예측 로직
 * 최근 15분 히스토리 기반 "곧 이용 가능할 확률" 계산
 */

const { getRedisClient: getRedis } = require('../config/redis');
const Station = require('../models/Station');
const diffingService = require('./diffingService');
const logger = require('../utils/logger');
const { TREND, PREDICTION } = require('../utils/constants');

class PredictionService {
    /**
     * 정류소의 이용 가능 확률 계산
     * @param {string} stationId - 정류소 ID
     * @returns {Promise<Object>} 예측 결과 { stationId, predictedAvailability, trend, confidence }
     */
    async calculateAvailability(stationId) {
        try {
            // 1. 최근 N분 히스토리 조회
            const history = await diffingService.getHistory(
                stationId,
                PREDICTION.HISTORY_MINUTES
            );

            // 2. 정류소 마스터 정보 조회
            const station = await Station.findOne({ stationId });
            if (!station) {
                return {
                    stationId,
                    predictedAvailability: null,
                    confidence: 0,
                    reason: 'station_not_found'
                };
            }

            // 3. 현재 자전거 수 조회
            const redis = getRedis();
            const currentCountStr = await redis.get(`station:${stationId}`);
            const currentCount = parseInt(currentCountStr) || 0;

            if (history.length < PREDICTION.MIN_DATA_POINTS) {
                // 데이터 부족해도 정류소 기본 정보는 포함해서 반환
                return {
                    stationId,
                    stationName: station.name,
                    name: station.name,
                    location: station.location,
                    totalRackCount: station.totalRackCount,
                    totalDocks: station.totalRackCount,
                    currentBikeCount: currentCount,
                    availableBikes: currentCount,
                    bikeCount: currentCount,
                    predictedAvailability: null,
                    trend: TREND.STABLE,
                    confidence: 0,
                    reason: 'insufficient_data'
                };
            }

            // 4. 변화 패턴 분석
            const returnCount = history.filter(h => h.changeType === 'RETURN').length;
            const rentalCount = history.filter(h => h.changeType === 'RENTAL').length;
            const netChange = returnCount - rentalCount;

            // 5. 신뢰도 계산 (데이터 많을수록 높음)
            const confidence = Math.min(history.length / 30, 1.0); // 30개 = 100% 신뢰도

            // 6. 예측 확률 계산
            // 공식: P = (반납수 / 거치대수) × 데이터신뢰도
            // 최근 반납이 많을수록 높음
            const returnsRatio = station.totalRackCount > 0 ? returnCount / station.totalRackCount : 0;
            const predictedAvailability = Math.min(
                returnsRatio * 100 * confidence,
                100
            );

            // 7. 추세 판단
            let trend = TREND.STABLE;
            if (netChange > 0) {
                trend = TREND.UP;
            } else if (netChange < 0) {
                trend = TREND.DOWN;
            }

            const result = {
                stationId,
                stationName: station.name,
                name: station.name, // 프론트엔드 호환
                location: station.location,
                totalRackCount: station.totalRackCount,
                totalDocks: station.totalRackCount, // 프론트엔드 호환
                currentBikeCount: currentCount,
                availableBikes: currentCount, // 프론트엔드 호환
                bikeCount: currentCount, // 프론트엔드 호환
                predictedAvailability: parseFloat(predictedAvailability.toFixed(2)),
                trend,
                confidence: parseFloat(confidence.toFixed(2)),
                recentReturns: returnCount,
                recentRentals: rentalCount,
                timestamp: new Date()
            };

            logger.debug(`[Prediction] ${station.name}: ${result.predictedAvailability}% (신뢰도: ${confidence})`);
            return result;

        } catch (error) {
            logger.error('[Prediction] 예측 계산 실패:', error);
            throw error;
        }
    }

    /**
     * 여러 정류소의 이용 가능 확률 일괄 계산
     * @param {Array<string>} stationIds - 정류소 ID 배열
     * @returns {Promise<Array>} 예측 결과 배열
     */
    async calculateBulk(stationIds) {
        try {
            const results = await Promise.all(
                stationIds.map(id => this.calculateAvailability(id))
            );
            return results;
        } catch (error) {
            logger.error('[Prediction] 일괄 예측 실패:', error);
            throw error;
        }
    }

    /**
     * 이용 가능성이 높은 정류소를 추천 (예측 기반)
     * @param {Array} stations - 정류소 배열
     * @param {number} topN - 상위 N개 추천 (기본값: 5)
     * @returns {Promise<Array>} 추천 정류소 배열 (이용 가능 확률 내림차순)
     */
    async getTopRecommendations(stations, topN = 5) {
        try {
            const predictions = await this.calculateBulk(
                stations.map(s => s.stationId)
            );

            const sortedByAvailability = predictions
                .filter(p => p.predictedAvailability !== null)
                .sort((a, b) => b.predictedAvailability - a.predictedAvailability)
                .slice(0, topN);

            return sortedByAvailability;

        } catch (error) {
            logger.error('[Prediction] 추천 조회 실패:', error);
            throw error;
        }
    }
}

module.exports = new PredictionService();
