# 🏗️ BikePulse 시스템 아키텍처 상세 설명

---

## 📐 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         외부 소스                                    │
│  서울시 공공자전거 따릉이 API (실시간 자전거 수)                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP GET
                               │ 30초마다
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Node.js Server (Express)                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 📡 Polling Job (jobs/pollStationStatus.js)                    │ │
│  │  - 30초 주기 스케줄링                                         │ │
│  │  - 2,700개 정류소 데이터 배치 수신                           │ │
│  │  - 응답 시간: 1~2초                                         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ 🔄 Diffing Service (services/diffingService.js)              │ │
│  │  - Redis와 신규 데이터 비교                                   │ │
│  │  - 변화 있는 정류소만 필터링                                  │ │
│  │  - 이벤트 발생 (평균 10~50개)                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                        ┌──────┴──────┐                              │
│                        ▼             ▼                              │
│      ┌─────────────────────────────────────────┐                    │
│      │ 🔮 Prediction (predictionService.js)   │                    │
│      │  - 최근 15분 히스토리 분석              │                    │
│      │  - 확률 모델 적용                       │                    │
│      │  - 이용 가능 확률 계산 (0~100%)        │                    │
│      └─────────────────────────────────────────┘                    │
│                               │                                      │
│      ┌────────────────────────┴────────────────────┐                │
│      │                                             │                │
│      ▼                                             ▼                │
│  ┌──────────────────────┐               ┌──────────────────────┐   │
│  │ Redis 업데이트       │               │ WebSocket 알림 발송  │   │
│  │ (실시간 캐시)        │               │ (Socket.io)          │   │
│  └──────────────────────┘               └──────────────────────┘   │
│      │                                             │                │
│      │                                             ▼                │
│      │                            ┌──────────────────────────────┐ │
│      │                            │ MongoDB 히스토리 저장        │ │
│      │                            │ (변화 기록)                 │ │
│      │                            └──────────────────────────────┘ │
│      │                                                             │
│      └────────────────────────────────────────────────────────────┘
│
└────────────┬─────────────────┬──────────────────┬──────────────────┐
             │                 │                  │                  │
             ▼                 ▼                  ▼                  ▼
       ┌──────────────┐ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
       │  MongoDB     │ │   Redis      │  │  Socket.io  │  │ Controllers  │
       │ (저장소)     │ │ (캐시)       │  │ (알림)      │  │ (API)        │
       └──────────────┘ └──────────────┘  └──────────────┘  └──────────────┘
             │                 │                  │                  │
             └────────────────────────────────────┼──────────────────┘
                                                  │
                                   HTTP Response / WebSocket Event
                                                  │
                                                  ▼
                                          ┌────────────────────┐
                                          │  클라이언트 앱      │
                                          │ (웹/모바일)        │
                                          └────────────────────┘
```

---

## 🔄 30초 주기 실시간 처리 흐름

### Timeline: 단일 Polling 사이클 (30초)

```
T=0초  ┌─────────────────────────────────────┐
       │ 📡 API Polling 시작                  │
       │ GET /api/stations/...               │
       └──────────────────┬────────────────────┘
                          │
                   ~1초 소요
                          │
T=1초  ┌──────────────────▼────────────────────┐
       │ 데이터 수신 완료                      │
       │ 2,700개 정류소 정보                   │
       │ [{stationId, bikeCount, ...}, ...]   │
       └──────────────────┬────────────────────┘
                          │
                   Diffing 시작
                          │
T=2초  ┌──────────────────▼────────────────────────────┐
       │ 🔄 Diffing 완료                               │
       │ Redis vs 신규 데이터 비교                      │
       │ - 변화 없음: 9,600개 (67%)                    │
       │ - 변화 있음: 1,400개 (33%)                    │
       │ → 이벤트 발생                                  │
       └──────────────┬───────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
       MongoDB     Redis       WebSocket
       저장 (~50ms) 업데이트 (~20ms)   알림 (~30ms)
          │           │           │
T=3초     └───────────┼───────────┘
                      │
                      ▼
          ┌─────────────────────────┐
          │ 📢 사용자에게 알림 전송 │
          │ (모니터링 중인 사용자만) │
          └─────────────────────────┘
          
T=4초 ~ T=30초
          
          ✅ 다음 Polling 대기
          
T=30초 ┌────────────────────┐
       │ 다음 사이클 시작... │
       └────────────────────┘
```

---

## 🎯 핵심 모듈 상세 설명

### 1️⃣ API Polling Module (`jobs/pollStationStatus.js`)

**역할**: 30초마다 따릉이 API에서 실시간 데이터를 수집

**구현 개요:**

```javascript
class PollingJob {
  // node-schedule 또는 setInterval 사용
  constructor() {
    this.interval = 30000; // 30초
    this.apiClient = new TtareunggieApiClient();
    this.queue = [];
  }

  async start() {
    setInterval(() => this.poll(), this.interval);
  }

  async poll() {
    try {
      // 1. API 호출 (GET)
      const response = await this.apiClient.getStations();
      
      // 2. 데이터 가공
      const stations = response.map(station => ({
        stationId: station.stationId,
        name: station.stationName,
        bikeCount: station.parkingBikeTotCnt,
        rackCount: station.rackTotCnt,
        lat: station.stationLatitude,
        lng: station.stationLongitude
      }));
      
      // 3. Diffing Service로 전달
      await diffingService.process(stations);
      
    } catch (error) {
      logger.error('Polling 실패:', error);
      // 재시도 로직
    }
  }
}
```

**병목 분석:**

| 단계 | 시간 | 최적화 방법 |
|------|------|-----------|
| API 호출 | ~800ms | 타임아웃 설정 (3초), 재시도 로직 |
| 데이터 가공 | ~50ms | 메모리 효율적인 map/filter |
| 다음 모듈 전달 | ~150ms | 비동기 처리 (await 최소화) |

---

### 2️⃣ Diffing Service (`services/diffingService.js`)

**역할**: 이전 상태(Redis)와 현재 상태(API)를 비교하여 변화 감지

**핵심 알고리즘:**

```javascript
class DiffingService {
  async process(newStations) {
    const changes = [];
    
    for (const newStation of newStations) {
      // Redis에서 기존 상태 조회 (O(1))
      const oldCount = await redis.get(`station:${newStation.stationId}`);
      
      if (oldCount === null) {
        // 첫 수집이면 무시 (기준값 설정)
        await redis.set(`station:${newStation.stationId}`, newStation.bikeCount, 'EX', 3600);
        continue;
      }
      
      const oldValue = parseInt(oldCount);
      
      // 변화 감지
      if (oldValue !== newStation.bikeCount) {
        const change = {
          stationId: newStation.stationId,
          stationName: newStation.name,
          oldCount: oldValue,
          newCount: newStation.bikeCount,
          delta: newStation.bikeCount - oldValue,
          changeType: newStation.bikeCount > oldValue ? 'RETURN' : 'RENTAL',
          timestamp: new Date()
        };
        
        changes.push(change);
        
        // Redis 즉시 업데이트
        await redis.set(`station:${newStation.stationId}`, newStation.bikeCount, 'EX', 3600);
        
        // MongoDB에 히스토리 저장 (비동기)
        StationLog.create(change).catch(err => logger.error(err));
        
        // 예측 계산 (비동기)
        predictionService.calculate(newStation.stationId).catch(err => logger.error(err));
        
        // WebSocket 알림 발송 (비동기)
        notificationService.notifyWatchers(newStation.stationId, change).catch(err => logger.error(err));
      }
    }
    
    logger.info(`Diffing 완료: ${changes.length}개 변화 감지`);
    return changes;
  }
}
```

**성능 특성:**

```
입력: 2,700개 정류소
처리:
  - Redis 조회: 2,700 × O(1) = O(2,700) = ~100ms
  - 비교 & 필터링: ~50ms
  - 이벤트 발생 & 캐시 업데이트: ~50ms
총 소요 시간: ~200ms

메모리 사용:
  - 최대 1,400개 변화 객체: ~500KB
```

---

### 3️⃣ Prediction Service (`services/predictionService.js`)

**역할**: 최근 15분 히스토리 기반 "곧 이용 가능할 확률" 계산

**예측 알고리즘:**

```javascript
class PredictionService {
  async calculate(stationId) {
    // 1. 최근 15분 데이터 조회
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000);
    const logs = await StationLog.find({
      stationId,
      createdAt: { $gte: fifteenMinutesAgo }
    }).sort({ createdAt: -1 });
    
    if (logs.length < 3) {
      return null; // 데이터 부족
    }
    
    // 2. 패턴 분석
    const returns = logs.filter(l => l.changeType === 'RETURN').length;
    const rentals = logs.filter(l => l.changeType === 'RENTAL').length;
    const netChange = returns - rentals;
    
    // 3. 현재 상태 조회
    const currentCount = await redis.get(`station:${stationId}`);
    const station = await Station.findOne({ stationId });
    
    // 4. 확률 계산
    // 공식: 
    //   P(available) = min(# of recent returns / station capacity, 1.0) 
    //                × confidence(data amount)
    const returnsRatio = returns / station.totalRackCount;
    const confidenceScore = Math.min(logs.length / 30, 1.0); // 30개가 100% 신뢰도
    const predictedAvailability = Math.min(returnsRatio * 100 * confidenceScore, 100);
    
    // 5. 결과 저장
    const prediction = {
      stationId,
      predictedAvailability,
      trend: netChange > 0 ? 'UP' : (netChange < 0 ? 'DOWN' : 'STABLE'),
      confidence: confidenceScore,
      timestamp: new Date()
    };
    
    await PredictionLog.create(prediction);
    return prediction;
  }
}
```

**예측 예시:**

```
정류소: 강남역 1번 출구
거치대: 25개

최근 15분 데이터:
┌─────┬────────┬─────┐
│ 시간 │ 자전거 │ 변화 │
├─────┼────────┼─────┤
│ 0분 │ 0대   │ -   │
│ 5분 │ 1대   │ +1  │ (반납)
│ 10분│ 2대   │ +1  │ (반납)
│ 15분│ 3대   │ +1  │ (반납)
└─────┴────────┴─────┘

분석:
- 반납 3회 / 거치대 25개 = 12%
- 데이터 3개 / 30개 = 10% 신뢰도
- 예측 확률 = 12% × 10% = 1.2%

??? 이건 너무 낮은데?

개선된 공식:
- 반납 연속 추세: "5분마다 +1대 반납"
- 현재 0대 → 5분 후 1대 → 10분 후 2대 예상
- "3분 내 이용 가능 확률: 75%" ← 추세 반영

실제 계산:
predictedAvailability = min(
  (3 returns / 25 racks) * 100,  // 12%
  1.0
) * min(3 datapoints / 30, 1.0)   // 신뢰도 10%
= 1.2%

⚠️ 더 나은 모델 필요 (선형 회귀, 이동평균 등)
```

---

### 4️⃣ Notification Service (`services/notificationService.js`)

**역할**: 변화 감지 시 관심 사용자에게 WebSocket 알림 전송

**구현:**

```javascript
class NotificationService {
  async notifyWatchers(stationId, change) {
    // 1. 해당 정류소 모니터링 사용자 조회
    const watchers = await UserWatchlist.find({
      stationId,
      active: true
    }).select('userId -_id');
    
    if (watchers.length === 0) {
      return; // 모니터링 사용자 없음
    }
    
    logger.info(`${stationId}의 ${watchers.length}명 사용자에게 알림`);
    
    // 2. 각 사용자에게 WebSocket 메시지 전송
    for (const watcher of watchers) {
      io.to(watcher.userId).emit('station_updated', {
        stationId: change.stationId,
        stationName: change.stationName,
        oldCount: change.oldCount,
        newCount: change.newCount,
        delta: change.delta,
        changeType: change.changeType,
        message: this.formatMessage(change),
        timestamp: change.timestamp
      });
    }
  }
  
  formatMessage(change) {
    if (change.changeType === 'RETURN') {
      return `자전거가 입고되었습니다! (${change.oldCount}대 → ${change.newCount}대)`;
    } else {
      return `자전거가 대여되었습니다. (${change.oldCount}대 → ${change.newCount}대)`;
    }
  }
}
```

---

## 🗂️ 폴더별 책임 분리 (Separation of Concerns)

```
src/
│
├── config/          역할: 초기화 및 연결
│   ├── database.js  └─ MongoDB 연결
│   ├── redis.js     └─ Redis 연결
│   └── apiClient.js └─ 외부 API 클라이언트
│
├── models/          역할: 데이터 구조 정의
│   ├── Station.js        └─ 정류소 마스터
│   ├── StationLog.js      └─ 변화 히스토리
│   ├── PredictionLog.js   └─ 예측 결과
│   └── UserWatchlist.js   └─ 사용자 관심
│
├── jobs/            역할: 백그라운드 작업 스케줄링
│   ├── pollStationStatus.js  └─ 30초마다 API 호출
│   └── scheduler.js           └─ 스케줄 관리
│
├── services/        역할: 비즈니스 로직
│   ├── diffingService.js      └─ 변화 감지
│   ├── predictionService.js   └─ 예측 계산
│   ├── notificationService.js └─ 알림 발송
│   └── geoService.js          └─ 지정학적 쿼리
│
├── controllers/     역할: HTTP 요청/응답
│   ├── stationController.js    └─ GET /stations
│   ├── userController.js       └─ POST /users/...
│   └── recommendController.js  └─ GET /recommend
│
├── socket/          역할: WebSocket 실시간 이벤트
│   ├── eventHandler.js    └─ 이벤트 핸들러
│   └── namespaces.js      └─ 네임스페이스 설정
│
└── utils/           역할: 공통 기능
    ├── logger.js      └─ 로깅
    ├── errorHandler.js └─ 에러 처리
    └── constants.js    └─ 상수
```

---

## 📊 확장성 고려 사항

### 수평 확장 (Horizontal Scaling)

**문제**: 단일 서버에서 처리 불가능한 부하

**해결:**

```
                    Load Balancer (Nginx)
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      [Server 1]       [Server 2]       [Server 3]
      (Polling)       (Polling)       (Polling)
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
     [Redis Cluster]  [MongoDB Replica Set]
```

**구현 팁:**

1. **Redis Cluster**: 데이터 분산 저장
2. **MongoDB Replica Set**: 데이터 동기화 및 페일오버
3. **Message Queue (Kafka/RabbitMQ)**: 이벤트 버퍼링

---

## 🎯 성능 목표 및 달성 방법

| 목표 | 목표값 | 달성 방법 |
|------|--------|---------|
| API 응답 시간 | < 50ms | Redis 캐싱 (O(1)) |
| Polling 주기 | 30초 | 스케줄링 (node-schedule) |
| 알림 지연 | < 100ms | 비동기 WebSocket (Socket.io) |
| 동시 사용자 | 10,000+ | Connection pooling, 로드 밸런싱 |
| DB 쿼리 속도 | < 100ms | 인덱싱 (2dsphere, TTL) |

---

## 🧠 주요 설계 결정사항 및 근거

| 결정 | 선택지 | 선택 이유 |
|------|--------|---------|
| Polling vs WebHook | **Polling** | 따릉이 API가 WebHook 미지원 |
| In-memory vs Disk Cache | **In-memory (Redis)** | 실시간성 (응답 시간 1-10ms) |
| SQL vs NoSQL | **NoSQL (MongoDB)** | 유연한 스키마, Geospatial 인덱스 |
| 단일 서버 vs 분산 | **단일 → 필요시 확장** | MVP 빠른 개발, 향후 확장 가능 |

---

이 아키텍처는 **확장성**, **실시간성**, **안정성**을 모두 고려하여 설계되었습니다. 🚀
