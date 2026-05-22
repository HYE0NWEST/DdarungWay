const mongoose = require('mongoose');

/**
 * Report 모델 (고장 신고 스키마)
 */
const reportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        stationId: {
            type: String, // 정류소 고유 ID (ST-...)
            required: true
        },
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip'
        },
        issueType: {
            type: String,
            enum: ['tire', 'chain', 'saddle', 'brake', 'terminal', 'other'],
            required: true
        },
        description: {
            type: String,
            maxlength: 500
        },
        status: {
            type: String,
            enum: ['pending', 'received', 'repairing', 'resolved'],
            default: 'pending'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
