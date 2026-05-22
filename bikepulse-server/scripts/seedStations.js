require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const mongoose = require('mongoose');
const Station = require('../src/models/Station'); // 이전에 만든 모델 경로

// DB 연결 (환경변수 사용)
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bikepulse';

async function seedDatabase() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 연결 성공, 데이터 파싱을 시작합니다...');

    const results = []; 

    // CSV 읽기 스트림 생성
    fs.createReadStream('./data/stations.csv')
        .pipe(csv({
            skipLines: 5, // 🚀 핵심: 공공데이터의 지저분한 상단 5줄 헤더를 무시합니다.
            headers: false // 헤더가 꼬여있으므로 인덱스(0, 1, 2...)로 접근합니다.
        }))
        .on('data', (data) => {
            // 6번째 줄부터 들어오는 데이터의 인덱스 매핑
            const rawId = data[0]?.trim(); // 102
            const stationId = rawId ? rawId.padStart(5, '0') : null; // 🚀 ID 포맷 통일 (00102)
            const name = data[1]?.trim(); // 망원역 1번출구 앞
            const lat = parseFloat(data[4]); // 37.5556488
            const lng = parseFloat(data[5]); // 126.91062927
            const rackCount = parseInt(data[8] || data[7], 10); // 거치대 수

            // 유효한 데이터만 배열에 담기
            if (stationId && !isNaN(lat) && !isNaN(lng)) {
                results.push({
                    stationId,
                    name,
                    totalRackCount: isNaN(rackCount) ? 0 : rackCount,
                    location: {
                        type: 'Point',
                        coordinates: [lng, lat] 
                    }
                });
            }
        })
        .on('end', async () => {
            try {
                console.log(`파싱 완료: 총 ${results.length}개의 대여소 데이터를 찾았습니다.`);

                // 기존 데이터 싹 밀어버리고 새로 넣기 (멱등성 보장)
                await Station.deleteMany({});
                await Station.insertMany(results);

                console.log('🎉 MongoDB에 모든 대여소 데이터 적재가 완료되었습니다!');
            } catch (error) {
                console.error('❌ 시딩 중 에러 발생:', error);
            } finally {
                process.exit(); // 스크립트 종료
            }
        });
}

seedDatabase();