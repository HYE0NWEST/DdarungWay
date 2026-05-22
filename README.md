# 🚲 따릉웨이 (DdarungWay)

실시간 데이터 분석 기반 스마트 서울 자전거 대여 서비스입니다.

## 🚀 주요 기능
- **실시간 지도**: 주변 정류소의 자전거 잔여 대수를 4가지 색상(회색, 빨강, 주황, 초록)으로 직관적 확인
- **스마트 예약**: 원하는 자전거를 10분간 선점할 수 있는 예약 시스템
- **자동 폴백 캐시**: Redis가 없어도 인메모리 모드로 자동 전환되어 중단 없는 서비스 제공
- **통합 관리**: 단일 터미널에서 서버와 프론트엔드 동시 실행 및 패키지 관리

## 🛠️ 실행 방법 (교수님 안내용)

본 프로젝트는 복잡한 인프라 설정 없이 바로 실행 가능하도록 최적화되어 있습니다.

1. **패키지 설치** (최상위 폴더에서 실행)
   ```bash
   npm install
   ```
   *이 명령어 하나로 서버와 프론트엔드의 모든 의존성이 자동 설치됩니다.*

2. **환경 변수 설정**
   - 각 폴더(`bikepulse-server`, `bikepulse-frontend`)의 `.env.example` 파일을 참고하여 `.env` 파일을 생성해 주세요.
   - (제출 시 별도로 제공해 드린 `.env` 파일을 각 폴더에 넣어주시면 바로 작동합니다.)

3. **프로젝트 실행**
   ```bash
   npm run dev
   ```
   *하나의 터미널에서 프론트엔드(5173)와 백엔드(5000)가 동시에 시작됩니다.*

## 🏗️ 기술 스택
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React, Framer Motion
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **Cache**: Redis (with In-memory Fallback support)
- **Maps**: Kakao Maps API

---
*본 프로젝트는 유연한 아키텍처 설정을 통해 Redis 미설치 환경에서도 `setTimeout` 기반의 TTL 엔진을 사용하여 모든 기능을 동일하게 제공합니다.*
