/**
 * Diffing Service - 변화 감지 로직
 * Redis와 신규 데이터를 비교하여 변화 있는 정류소만 추출
 */

const { getRedisClient } = require('../config/redis');
const StationLog = require('../models/StationLog');
const logger = require('../utils/logger');
const { CHANGE_TYPE } = require('../utils/constants');

class DiffingService {
    /**
     * 신규 데이터와 기존 Redis 데이터를 비교하여 변화 감지
     * @param {Array} newStations - API에서 수신한 신규 정류소 데이터
     * @returns {Promise<Array>} 변화 있는 정류소 배열
     */
    async detectChanges(newStations) {
        const redis = getRedisClient();
        const changes = [];

        try {
            for (const newStation of newStations) {
                if (!newStation || !newStation.stationId) {
                    logger.warn('[Diffing] 유효하지 않은 정류소 데이터 스킵');
                    continue;
                }

                const stationKey = `station:${newStation.stationId}`;

                // Redis에서 기존 상태 조회
                const oldCountStr = await redis.get(stationKey);

                if (oldCountStr === null) {
                    // 첫 수집 (또는 TTL 만료) - 무시하고 기준값만 설정
                    await redis.set(
                        stationKey,
                        String(newStation.bikeCount ?? 0),
                        'EX',
                        3600
                    );
                    continue;
                }

                const oldCount = parseInt(oldCountStr);
                const newCount = newStation.bikeCount ?? 0;

                // 변화 감지
                if (oldCount !== newCount) {
                    const change = {
                        stationId: newStation.stationId,
                        stationName: newStation.stationName,
                        oldCount,
                        newCount,
                        delta: newCount - oldCount,
                        changeType: newCount > oldCount ? CHANGE_TYPE.RETURN : CHANGE_TYPE.RENTAL,
                        timestamp: new Date()
                    };

                    changes.push(change);

                    // Redis 즉시 업데이트 (O(1))
                    await redis.set(
                        stationKey,
                        (newCount ?? 0).toString(),
                        'EX',
                        3600
                    );

                    // MongoDB에 히스토리 저장 (비동기)
                    this._saveHistoryAsync(change);
                }
            }

            logger.info(`[Diffing] ${newStations.length}개 정류소 중 ${changes.length}개 변화 감지`);
            return changes;

        } catch (error) {
            logger.error('[Diffing] 변화 감지 실패:', error);
            throw error;
        }
    }

    /**
     * 변화 히스토리를 MongoDB에 비동기로 저장
     * @private
     */
    async _saveHistoryAsync(change) {
        try {
            await StationLog.create(change);
        } catch (error) {
            logger.warn('[Diffing] 히스토리 저장 실패:', error.message);
        }
    }

    /**
     * 특정 정류소의 최근 변화 이력 조회
     * @param {string} stationId - 정류소 ID
     * @param {number} minutes - 몇 분 전부터의 데이터 조회 (기본값: 15분)
     * @returns {Promise<Array>} 변화 히스토리
     */
    async getHistory(stationId, minutes = 15) {
        try {
            const timeAgo = new Date(Date.now() - minutes * 60000);

            const logs = await StationLog.find({
                stationId,
                createdAt: { $gte: timeAgo }
            }).sort({ createdAt: -1 });

            return logs;

        } catch (error) {
            logger.error('[Diffing] 히스토리 조회 실패:', error);
            throw error;
        }
    }
}

module.exports = new DiffingService();
