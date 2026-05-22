const axios = require('axios');

const API_KEY = process.env.DDAREUNGI_API_KEY;
const BASE_URL = `http://openapi.seoul.go.kr:8088/${API_KEY}/json/bikeList`;

/**
 * 서울시 전체 대여소의 실시간 자전거 수를 가져옵니다. (동적 페이징 적용)
 */
async function getStations() {
  try {
    let allStations = [];
    let start = 1;
    let end = 1000;
    let hasMore = true;

    console.time('API Fetch Time');

    while (hasMore) {
      const response = await axios.get(`${BASE_URL}/${start}/${end}/`);
      const rows = response.data?.rentBikeStatus?.row || [];
      
      if (rows.length === 0) {
        hasMore = false;
      } else {
        allStations = allStations.concat(rows);
        start += 1000;
        end += 1000;
        
        // 안전 장치: 너무 많은 요청 방지 (서울시 대여소는 현재 약 2700~3000개 사이)
        if (start > 10000) break; 
      }
    }
    
    console.timeEnd('API Fetch Time');

    console.log(`✅ 총 ${allStations.length}개의 실시간 대여소 정보를 가져왔습니다.`);
    
    return allStations.map(station => {
      const rawId = station.stationName.split('.')[0];
      const stationId = rawId ? rawId.padStart(5, '0') : '';
      
      return {
        stationId: stationId,
        bikeCount: parseInt(station.parkingBikeTotCnt, 10),
        rackCount: parseInt(station.rackTotCnt, 10),
        stationName: station.stationName
      };
    });
  } catch (error) {
    console.error('❌ 따릉이 API 통신 실패:', error.message);
    throw error;
  }
}

module.exports = { getStations };