/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         ticketType:
 *           type: string
 *         amount:
 *           type: number
 *         paymentType:
 *           type: string
 *           enum: [PASS_PURCHASE, OVERTIME_FEE]
 *         paymentMethod:
 *           type: string
 *         orderId:
 *           type: string
 *           description: 프론트엔드에서 생성한 주문번호
 *         paymentKey:
 *           type: string
 *           description: 토스에서 발급한 결제키
 *         status:
 *           type: string
 *           enum: [PENDING, COMPLETED, FAILED, CANCELED]
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        ticketType: { type: String, required: true }, // 어떤 이용권을 샀는지
        amount: { type: Number, required: true }, // 결제 금액
        paymentType: { type: String, enum: ['PASS_PURCHASE', 'OVERTIME_FEE'], required: true },
        paymentMethod: { type: String, default: 'TOSS_WIDGET' }, // 토스 위젯 결제
        orderId: { type: String, required: true, unique: true },
        paymentKey: { type: String, required: true, unique: true },
        status: {
            type: String,
            enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELED'],
            default: 'PENDING'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);