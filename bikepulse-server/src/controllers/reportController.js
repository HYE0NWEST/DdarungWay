const Report = require('../models/Report');
const logger = require('../utils/logger');

/**
 * 고장 신고 제출
 */
exports.createReport = async (req, res) => {
    try {
        const { stationId, tripId, issueType, description } = req.body;

        if (!stationId || !issueType) {
            return res.status(400).json({ status: 'error', message: '정류소 정보와 고장 유형은 필수입니다.' });
        }

        const report = await Report.create({
            userId: req.user._id,
            stationId,
            tripId,
            issueType,
            description
        });

        logger.info(`[Report] New issue reported by user ${req.user.email}: ${issueType}`);

        res.status(201).json({
            status: 'success',
            data: { report }
        });
    } catch (error) {
        logger.error('Create Report Error:', error);
        res.status(500).json({ status: 'error', message: '고장 신고 접수에 실패했습니다.' });
    }
};

/**
 * 나의 고장 신고 내역 조회
 */
exports.getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json({ status: 'success', data: { reports } });
    } catch (error) {
        logger.error('Get My Reports Error:', error);
        res.status(500).json({ status: 'error', message: '신고 내역을 불러오지 못했습니다.' });
    }
};
