/**
 * MongoDB 연결 설정
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bikepulse';

async function connectMongoDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        logger.info('MongoDB 연결 성공');
        return mongoose.connection;

    } catch (error) {
        logger.error('MongoDB 연결 실패:', error.message);
        throw error;
    }
}

function getConnection() {
    return mongoose.connection;
}

module.exports = {
    connectMongoDB,
    getConnection
};
