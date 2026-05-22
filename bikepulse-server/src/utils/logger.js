/**
 * 로깅 유틸리티 (Winston)
 */

const winston = require('winston');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ level, message, timestamp, stack }) => {
            const msg = stack || message;
            return `[${timestamp}] [${level.toUpperCase()}] ${msg}`;
        })
    ),
    defaultMeta: { service: 'bikepulse' },
    transports: [
        // 콘솔 출력
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp }) => {
                    return `[${timestamp}] [${level}] ${message}`;
                })
            )
        }),
        // 파일 저장
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        })
    ]
});

module.exports = logger;
