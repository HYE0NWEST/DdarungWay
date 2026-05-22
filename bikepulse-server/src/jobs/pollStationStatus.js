/**
 * API Polling Job - 30초마다 외부 API에서 데이터 수집
 */

const schedule = require('node-schedule');
const apiClient = require('../config/apiClient');
const diffingService = require('../services/diffingService');
const predictionService = require('../services/predictionService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');
const { POLLING } = require('../utils/constants');

class PollingJob {
    constructor() {
        this.job = null;
        this.isRunning = false;
        this.pollCount = 0;
        this.errorCount = 0;
    }

    /**
     * Polling 작업 시작
     */
    async start() {
        if (this.job) {
            logger.warn('[PollingJob] 이미 실행 중입니다');
            return;
        }

        try {
            // node-schedule을 이용한 반복 스케줄링
            this.job = schedule.scheduleJob(`*/${Math.ceil(POLLING.INTERVAL_MS / 1000)} * * * * *`, async () => {
                await this.poll();
            });

            logger.info('[PollingJob] Polling 작업 시작 (30초 주기)');

            // 첫 번째 poll은 즉시 실행
            await this.poll();

        } catch (error) {
            logger.error('[PollingJob] 시작 실패:', error);
            throw error;
        }
    }

    /**
     * 단일 Polling 실행
     */
    async poll() {
        if (this.isRunning) {
            logger.debug('[PollingJob] 이전 polling 아직 진행 중 - 스킵');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.debug('[PollingJob] API Polling 시작');

            // 1. API에서 데이터 수집
            const stations = await apiClient.getStations();

            if (!stations || stations.length === 0) {
                logger.warn('[PollingJob] API 응답 데이터 없음');
                return;
            }

            logger.debug(`[PollingJob] ${stations.length}개 정류소 데이터 수신`);

            // 2. Diffing - 변화 감지
            const changes = await diffingService.detectChanges(stations);

            if (changes.length > 0) {
                // 3. 변화가 있는 정류소별로 예측 및 알림 처리
                for (const change of changes) {
                    try {
                        // 예측 계산 (비동기)
                        predictionService.calculateAvailability(change.stationId)
                            .catch(err => logger.warn('[PollingJob] 예측 계산 실패:', err.message));

                        // 알림 발송 (비동기)
                        notificationService.notifyWatchers(change.stationId, change)
                            .catch(err => logger.warn('[PollingJob] 알림 발송 실패:', err.message));

                    } catch (error) {
                        logger.warn('[PollingJob] 변화 처리 중 오류:', error.message);
                    }
                }
            }

            this.pollCount++;
            const duration = Date.now() - startTime;
            logger.debug(`[PollingJob] Polling 완료 (${duration}ms) | 누적: ${this.pollCount}회`);

        } catch (error) {
            this.errorCount++;
            logger.error('[PollingJob] Polling 실패:', error);
            logger.warn(`[PollingJob] 에러 발생 횟수: ${this.errorCount}회`);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Polling 작업 중지
     */
    stop() {
        if (this.job) {
            this.job.cancel();
            this.job = null;
            logger.info('[PollingJob] Polling 작업 중지');
        }
    }

    /**
     * Polling 상태 조회
     */
    getStatus() {
        return {
            running: this.job !== null,
            pollCount: this.pollCount,
            errorCount: this.errorCount,
            errorRate: this.pollCount > 0 ? (this.errorCount / this.pollCount * 100).toFixed(2) + '%' : '0%'
        };
    }
}

// Singleton 패턴
let pollingJob = null;

function getPollingJob() {
    if (!pollingJob) {
        pollingJob = new PollingJob();
    }
    return pollingJob;
}

module.exports = { getPollingJob };
