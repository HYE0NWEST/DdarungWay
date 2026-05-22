/**
 * 인증 미들웨어
 * 요청 헤더의 JWT 토큰을 검증하고 사용자 정보를 req.user에 저장합니다.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * 토큰 검증 및 사용자 인증 미들웨어
 */
exports.protect = async (req, res, next) => {
    try {
        let token;

        // 1. 헤더 또는 쿼리 파라미터에서 토큰 추출
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: '로그인이 필요합니다. 토큰을 제공해주세요.'
            });
        }

        // 2. 토큰 검증
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 3. 토큰에 포함된 ID로 사용자 조회
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'fail',
                message: '이 토큰에 해당하는 사용자가 더 이상 존재하지 않습니다.'
            });
        }

        // 4. 인증 완료: req.user에 사용자 정보 저장
        req.user = currentUser;
        next();
    } catch (error) {
        logger.error('Auth Middleware Error:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                status: 'fail',
                message: '유효하지 않은 토큰입니다.'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'fail',
                message: '토큰이 만료되었습니다. 다시 로그인해주세요.'
            });
        }

        res.status(500).json({
            status: 'error',
            message: '인증 처리 중 오류가 발생했습니다.'
        });
    }
};

/**
 * 권한 제한 미들웨어 (예: 관리자 전용)
 */
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: '이 작업을 수행할 권한이 없습니다.'
            });
        }
        next();
    };
};
