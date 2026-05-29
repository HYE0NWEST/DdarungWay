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
                // 🚀 개선: 데이터가 아예 없을 때도 사용자에게 '예측 시뮬레이션' 제공 (또는 기본값)
                // 현재 자전거 수와 시간대를 고려한 휴리스틱 적용
                const hour = new Date().getHours();
                const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
                
                // 자전거가 많으면 대여 가능성 높음, 러시아워에는 변동성 큼
                let simulatedProb = currentCount > 5 ? 70 : currentCount > 0 ? 40 : 10;
                if (isRushHour) simulatedProb = Math.max(simulatedProb - 20, 5);

                const result = {
                    stationId,
                    stationName: station.name,
                    name: station.name,
                    location: station.location,
                    totalRackCount: station.totalRackCount,
                    totalDocks: station.totalRackCount,
                    currentBikeCount: currentCount,
                    availableBikes: currentCount,
                    bikeCount: currentCount,
                    predictedAvailability: simulatedProb, // 시뮬레이션 값 제공
                    trend: TREND.STABLE,
                    confidence: 0.1, // 낮은 신뢰도
                    reason: 'simulated_insufficient_data',
                    timestamp: new Date()
                };
                
                logger.info(`[Prediction] ${station.name}: ${result.predictedAvailability}% (시뮬레이션)`);
                return result;
            }

            // 4. 변화 패턴 분석
            const returnCount = history.filter(h => h.changeType === 'RETURN').length;
            const rentalCount = history.filter(h => h.changeType === 'RENTAL').length;
            const netChange = returnCount - rentalCount;

            // 5. 신뢰도 계산 (데이터 많을수록 높음)
            const activityScore = returnCount + rentalCount;
            let confidence = Math.min(activityScore / 10, 1.0); // 15분 내 10건 이상 변화면 신뢰도 100%
            if (activityScore === 0) confidence = 0.1; // 변화가 아예 없어도 데이터가 있다는 것 자체가 약간의 신뢰

            // 6. 예측 확률 계산
            // 공식: (순증가량 / 거치대수) 기반 가중치 부여
            let probability = 0;
            if (station.totalRackCount > 0) {
                if (netChange > 0) {
                    // 반납 추세 (금방 들어올 확률 높음)
                    probability = Math.min((netChange * 2) / station.totalRackCount * 100, 100);
                } else if (returnCount > 0) {
                    // 순증가는 아니지만 지속적인 반납이 일어남 (교체 활발)
                    probability = Math.min(returnCount / station.totalRackCount * 50, 50);
                } else if (currentCount === 0) {
                    // 자전거도 없고 반납도 없으면 거의 가망 없음
                    probability = 0;
                } else {
                    // 자전거는 있는데 대여만 일어남
                    probability = 10;
                }
            }

            // 신뢰도를 가중하여 최종 예측치 도출
            const predictedAvailability = Math.min(probability * (0.5 + 0.5 * confidence), 100);

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

            logger.info(`[Prediction] ${station.name}: ${result.predictedAvailability}% (신뢰도: ${confidence})`);
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
