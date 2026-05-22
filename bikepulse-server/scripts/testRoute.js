require('dotenv').config();
const routeService = require('../src/services/routeService');

async function testRouteService() {
    // 테스트용 좌표 (홍대입구역 근처)
    const startX = 126.92362;
    const startY = 37.55670;
    const endX = 126.92432;
    const endY = 37.55170;

    console.log(`[Test] 경로 조회 테스트 시작: (${startX}, ${startY}) -> (${endX}, ${endY})`);

    try {
        const coordinates = await routeService.getPedestrianRoute(startX, startY, endX, endY);
        console.log('\n✅ 경로 조회 성공!');
        console.log(`총 ${coordinates.length}개의 좌표 추출`);
        console.log('상위 5개 좌표:', coordinates.slice(0, 5));
    } catch (error) {
        console.error('\n❌ 경로 조회 실패:', error.message);
        if (error.response) {
            console.error('응답 상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        }
    }
}

testRouteService();
