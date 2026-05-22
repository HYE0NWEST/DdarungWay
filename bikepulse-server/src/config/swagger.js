const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BikePulse API 명세서',
            version: '1.0.0',
            description: '실시간 자전거 대여 및 경로 추천 모빌리티 서비스 API',
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: '로컬 개발 서버',
            },
        ],
        // JWT 토큰 인증을 위한 보안 설정
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // API 라우트 파일들이 있는 경로 (주석을 읽어올 위치)
    apis: [
        './src/routes/*.js',
        './src/models/*.js',
    ],
};

const specs = swaggerJSDoc(options);

module.exports = specs;