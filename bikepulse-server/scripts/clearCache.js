require('dotenv').config();
const { createClient } = require('redis');

async function clearRedisCache() {
    // .env의 REDIS_URL 사용
    const client = createClient({ 
        url: process.env.REDIS_URL || 'redis://localhost:6379' 
    });
    
    client.on('error', (err) => console.error('❌ Redis 클라이언트 에러:', err));
    
    try {
        await client.connect();
        console.log('✅ Redis 연결 성공');
        
        // flushAll() : Redis 안의 모든 데이터를 깨끗하게 삭제합니다.
        await client.flushAll();
        console.log('🗑️ Redis 캐시 데이터가 모두 초기화되었습니다.');
        
    } catch (error) {
        console.error('❌ 초기화 중 에러 발생:', error);
    } finally {
        await client.disconnect();
        process.exit(); // 작업 완료 후 스크립트 종료
    }
}

clearRedisCache();