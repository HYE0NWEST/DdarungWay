const mongoose = require('mongoose');

/**
 * Inquiry 모델 (1:1 문의 스키마)
 */
const inquirySchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        title: {
            type: String,
            required: [true, '제목을 입력해주세요.'],
            trim: true,
            maxlength: 100
        },
        content: {
            type: String,
            required: [true, '내용을 입력해주세요.'],
            maxlength: 2000
        },
        category: {
            type: String,
            enum: ['account', 'payment', 'trip', 'bug', 'other'],
            default: 'other'
        },
        status: {
            type: String,
            enum: ['pending', 'answered'],
            default: 'pending'
        },
        answer: {
            type: String,
            default: null
        },
        answeredAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
