const axios = require('axios');
const Payment = require('../models/Payment');
const User = require('../models/User');

// 따릉이 요금표 (서버 절대 기준)
const TICKET_TABLE = {
    'DAILY_1H': { price: 1000, days: 1, baseMins: 60 },
    'DAILY_2H': { price: 2000, days: 1, baseMins: 120 },
    'REGULAR_30D_1H': { price: 5000, days: 30, baseMins: 60 },
};

exports.confirmPayment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { paymentKey, orderId, amount, ticketType } = req.body;

        // 1. 요금표 검증 (클라이언트가 금액을 조작했는지 확인)
        const ticketInfo = TICKET_TABLE[ticketType];
        if (!ticketInfo || amount !== ticketInfo.price) {
            return res.status(400).json({ status: 'fail', message: '결제 금액이 일치하지 않거나 유효하지 않은 이용권입니다.' });
        }

        // 2. 토스페이먼츠 승인 요청 (API 연동)
        const secretKey = process.env.TOSS_SECRET_KEY;
        const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString('base64');

        try {
            await axios.post(
                'https://api.tosspayments.com/v1/payments/confirm',
                { paymentKey, orderId, amount },
                { headers: { Authorization: `Basic ${encryptedSecretKey}`, 'Content-Type': 'application/json' } }
            );
        } catch (tossError) {
            // 토스 측에서 승인 거절 시
            const failMessage = tossError.response?.data?.message || '토스 결제 승인에 실패했습니다.';
            return res.status(400).json({ status: 'error', message: failMessage });
        }

        // 3. 결제 완료 처리 및 DB 저장
        const paymentRecord = await Payment.create({
            userId,
            ticketType,
            amount,
            paymentType: 'PASS_PURCHASE',
            orderId,
            paymentKey,
            status: 'COMPLETED'
        });

        // 4. 유저 이용권 업데이트
        const user = await User.findById(userId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + ticketInfo.days);

        user.activePass = ticketType;
        user.passBaseMinutes = ticketInfo.baseMins;
        user.passExpiresAt = expiresAt;
        await user.save();

        res.status(200).json({ status: 'success', data: { user, payment: paymentRecord } });

    } catch (error) {
        res.status(500).json({ status: 'error', message: '서버 내부 결제 처리 중 오류가 발생했습니다.' });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        const history = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json({ status: 'success', count: history.length, data: history });
    } catch (error) {
        res.status(500).json({ status: 'error', message: '결제 내역 조회 실패' });
    }
};

/**
 * 결제 취소 및 환불
 * POST /api/payments/cancel
 */
exports.cancelPayment = async (req, res) => {
    try {
        const { paymentKey, cancelReason } = req.body;

        // 1. DB에서 해당 결제 내역 확인
        const payment = await Payment.findOne({ paymentKey });
        if (!payment || payment.status !== 'COMPLETED') {
            return res.status(404).json({ status: 'fail', message: '취소 가능한 결제 내역이 없습니다.' });
        }

        // 2. 토스페이먼츠 취소 API 호출
        const secretKey = process.env.TOSS_SECRET_KEY;
        const encryptedSecretKey = Buffer.from(`${secretKey}:`).toString('base64');

        await axios.post(
            `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`,
            { cancelReason },
            { headers: { Authorization: `Basic ${encryptedSecretKey}`, 'Content-Type': 'application/json' } }
        );

        // 3. DB 상태 업데이트 및 이용권 회수
        payment.status = 'CANCELED';
        await payment.save();

        const user = await User.findById(payment.userId);
        user.activePass = null;
        user.passExpiresAt = null;
        await user.save();

        res.status(200).json({ status: 'success', message: '환불이 완료되었습니다.' });

    } catch (error) {
        console.error('Cancel Error:', error.response?.data || error.message);
        res.status(400).json({ status: 'error', message: '환불 처리에 실패했습니다.' });
    }
};