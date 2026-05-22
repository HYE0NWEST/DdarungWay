const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        type: {
            type: String,
            enum: ['SNIPING', 'TRIP', 'PAYMENT', 'MARKETING', 'SYSTEM'],
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        data: {
            type: mongoose.Schema.Types.Mixed, // 추가 데이터 (예: stationId, tripId)
            default: {}
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model('Notification', notificationSchema);
