/**
 * BikePulse Server - 진입점
 * Express 서버 초기화 및 미들웨어 설정
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const logger = require('./utils/logger');
const { connectMongoDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

// 배경 작업(Cron Job) 임포트
const { getPollingJob } = require('./jobs/pollStationStatus');

// 라우터 임포트
const stationRoutes = require('./routes/stations');
const navigationRoutes = require('./routes/navigation');
const userRoutes = require('./routes/users');
const authRoutes = require('./routes/auth');
const recommendRoutes = require('./routes/recommend');
const tripRoutes = require('./routes/tripRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notifications');
const reportRoutes = require('./routes/reports');

const app = express();

// ========== 미들웨어 ==========
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: message => logger.info(message) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI (API 문서)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// ========== 헬스 체크 ==========
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ========== API 라우트 ==========
app.use('/api/stations', stationRoutes);
app.use('/api/routes', navigationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// ========== 에러 핸들러 ==========
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    logger.error('Error Status:', err.status || 500);
    logger.error('Error Message:', err.message);

    res.status(err.status || 500).json({
        status: 'error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// ========== 서버 시작 ==========
async function start() {
    try {
        // 1. MongoDB 연결
        await connectMongoDB();
        logger.info('✅ MongoDB 연결 완료');

        // 2. Redis 연결
        await connectRedis();
        logger.info('✅ Redis 연결 완료');

        // 3. 배경 작업 시작 (실시간 데이터 폴링)
        const pollingJob = getPollingJob();
        await pollingJob.start();
        logger.info('📡 API Polling 작업 시작 (30초 주기)');

        // 4. 포트 바인딩 및 서버 실행
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            logger.info(`✅ 서버 시작: http://localhost:${PORT}`);
            logger.info(`📝 API 문서: http://localhost:${PORT}/api-docs`);
        });

    } catch (error) {
        logger.error('서버 시작 실패:', error);
        process.exit(1);
    }
}

// Graceful Shutdown (서버 안전 종료 설정)
process.on('SIGTERM', () => {
    logger.info('SIGTERM 신호 수신. 서버 종료 중...');
    process.exit(0);
});

if (require.main === module) {
    start();
}

module.exports = app;