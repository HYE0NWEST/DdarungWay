const Inquiry = require('../models/Inquiry');
const logger = require('../utils/logger');

/**
 * 1:1 문의 생성
 * POST /api/inquiries
 */
exports.createInquiry = async (req, res) => {
    try {
        const { title, content, category } = req.body;

        if (!title || !content) {
            return res.status(400).json({ 
                status: 'fail', 
                message: '제목과 내용을 모두 입력해주세요.' 
            });
        }

        const inquiry = await Inquiry.create({
            userId: req.user._id,
            title,
            content,
            category: category || 'other'
        });

        logger.info(`[Inquiry] New inquiry created by user ${req.user.email}: ${title}`);

        res.status(201).json({
            status: 'success',
            data: { inquiry }
        });
    } catch (error) {
        logger.error('[InquiryController] Create Error:', error);
        res.status(500).json({ status: 'error', message: '문의 접수에 실패했습니다.' });
    }
};

/**
 * 나의 문의 내역 조회
 * GET /api/inquiries
 */
exports.getMyInquiries = async (req, res) => {
    try {
        const inquiries = await Inquiry.find({ userId: req.user._id })
            .sort({ createdAt: -1 });

        res.status(200).json({
            status: 'success',
            data: { inquiries }
        });
    } catch (error) {
        logger.error('[InquiryController] GetMy Error:', error);
        res.status(500).json({ status: 'error', message: '문의 내역을 불러오지 못했습니다.' });
    }
};

/**
 * 문의 상세 조회
 * GET /api/inquiries/:id
 */
exports.getInquiryDetail = async (req, res) => {
    try {
        const inquiry = await Inquiry.findOne({ 
            _id: req.params.id, 
            userId: req.user._id 
        });

        if (!inquiry) {
            return res.status(404).json({ 
                status: 'fail', 
                message: '해당 문의를 찾을 수 없습니다.' 
            });
        }

        res.status(200).json({
            status: 'success',
            data: { inquiry }
        });
    } catch (error) {
        logger.error('[InquiryController] GetDetail Error:', error);
        res.status(500).json({ status: 'error', message: '문의 상세 정보를 불러오지 못했습니다.' });
    }
};
