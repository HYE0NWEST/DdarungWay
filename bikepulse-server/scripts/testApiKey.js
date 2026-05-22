require('dotenv').config();
const axios = require('axios');

async function testApiKey() {
    const API_KEY = '776d5474626d617836366f7a4f4b45';
    const url = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/bikeList/1/5/`;

    console.log(`테스트 URL: ${url}`);
    
    try {
        const response = await axios.get(url);
        console.log('--- API 응답 데이터 ---');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.rentBikeStatus) {
            console.log('\n✅ 인증 성공! 유효한 API 키입니다.');
        } else if (response.data.RESULT && response.data.RESULT.CODE === 'INFO-000') {
            console.log('\n✅ 인증 성공! 유효한 API 키입니다.');
        } else {
            console.log('\n❌ 인증 실패: API 응답이 예상과 다릅니다.');
        }
    } catch (error) {
        console.error('\n❌ 테스트 실패:', error.message);
        if (error.response) {
            console.error('응답 상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        }
    }
}

testApiKey();
