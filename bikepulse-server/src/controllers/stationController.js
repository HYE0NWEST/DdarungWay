/**
 * Station Controller - 정류소 관련 요청 처리
 */
const Station = require('../models/Station');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * 1️⃣ GET /api/stations
 * 모든 정류소 목록을 반환 (MongoDB 정보 + Redis 실시간 자전거 수 결합)
 */
const getStations = async (req, res) => {
    try {
        const { search, page: pageQuery, limit: limitQuery } = req.query;
        
        // 페이징 처리
        const page = parseInt(pageQuery, 10) || 1;
        const limit = parseInt(limitQuery, 10) || 3000;
        const skip = (page - 1) * limit;

        // 검색 조건 추가
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        // 1. MongoDB에서 마스터 데이터(위치, 이름, 거치대 수) 가져오기
        const stations = await Station.find(query).skip(skip).limit(limit).lean();
        const total = await Station.countDocuments(query);

        // 2. 각 정류소마다 Redis를 뒤져서 실시간 '자전거 남은 수' 가져오기 (MGET으로 최적화)
        const redisClient = getRedisClient();
        const keys = stations.map(s => `station:${s.stationId}`);
        const counts = redisClient ? await redisClient.mGet(keys) : [];

        const data = stations.map((station, index) => {
            const bikeCount = counts[index] ? parseInt(counts[index], 10) : 0;
            
            // ✅ 필드명 표준화 및 병합 로직 강화
            const totalDocks = station.totalRackCount || 0;
            const shared = totalDocks > 0 ? Math.round((bikeCount / totalDocks) * 100) : 0;
            
            let congestionStatus = '데이터 없음';
            if (totalDocks > 0) {
                if (shared <= 30) congestionStatus = '여유로움';
                else if (shared <= 70) congestionStatus = '보통';
                else if (shared <= 100) congestionStatus = '혼잡함';
                else congestionStatus = '매우 혼잡(반납 어려움)';
            }

            return {
                ...station,
                availableBikes: bikeCount, 
                totalDocks: totalDocks,
                shared: shared,
                congestionStatus: congestionStatus,
                availabilityRate: totalDocks > 0 ? (bikeCount / totalDocks).toFixed(2) : 0
            };
        });

        res.json({ success: true, total, page, limit, data });
    } catch (error) {
        logger.error('[StationController] 전체 목록 조회 실패:', error.message);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
};

/**
 * 2️⃣ GET /api/stations/:id
 * 특정 정류소 상세 조회
 */
const getStationById = async (req, res) => {
    try {
        const { id } = req.params;

        const station = await Station.findOne({ stationId: id }).lean();
        if (!station) {
            return res.status(404).json({ success: false, message: '정류소를 찾을 수 없습니다.' });
        }

        const redisClient = getRedisClient();
        const bikeCountStr = await redisClient.get(`station:${id}`);
        const bikeCount = bikeCountStr ? parseInt(bikeCountStr, 10) : 0;

        const totalDocks = station.totalRackCount || 0;
        const shared = totalDocks > 0 ? Math.round((bikeCount / totalDocks) * 100) : 0;
        
        let congestionStatus = '데이터 없음';
        if (totalDocks > 0) {
            if (shared <= 30) congestionStatus = '여유로움';
            else if (shared <= 70) congestionStatus = '보통';
            else if (shared <= 100) congestionStatus = '혼잡함';
            else congestionStatus = '매우 혼잡(반납 어려움)';
        }

        res.json({
            success: true,
            data: {
                ...station,
                availableBikes: bikeCount,
                totalDocks: totalDocks,
                shared: shared,
                congestionStatus: congestionStatus,
                availabilityRate: totalDocks > 0 ? (bikeCount / totalDocks).toFixed(2) : 0
            }
        });
    } catch (error) {
        logger.error('[StationController] 상세 조회 실패:', error.message);
        res.status(500).json({ success: false, message: '서버 에러가 발생했습니다.' });
    }
};

module.exports = {
    getStations,
    getStationById
};
