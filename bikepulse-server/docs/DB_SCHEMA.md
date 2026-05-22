# 📊 BikePulse 데이터베이스 스키마

## MongoDB & Redis 설계 가이드

---

## 🏗️ 아키텍처 개요

```
┌─────────────────────────────────────────────────┐
│                  데이터 계층                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  📌 MongoDB                 ⚡ Redis             │
│  (정적 + 히스토리)         (실시간 동적)         │
│  ├─ Station                ├─ station:{id}    │
│  ├─ StationLog             └─ user:{id}:watch │
│  ├─ PredictionLog          list               │
│  └─ UserWatchlist                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 📚 MongoDB 컬렉션 정의

### 1. `stations` 컬렉션 (정류소 마스터 정보)

**목적**: 정류소의 고정 정보 저장 (위치, 이름, 용량 등)

**스키마:**

```javascript
{
  _id: ObjectId,
  
  // 기본 정보
  stationId: String,              // 정류소 ID (unique, indexed)
  name: String,                   // 정류소명 (예: "강남역 1번 출구")
  district: String,               // 자치구 (예: "강남구")
  
  // 위치 정보
  location: {
    type: "Point",               // GeoJSON type
    coordinates: [Number, Number] // [경도, 위도]
  },
  
  // 용량 정보
  totalRackCount: Number,         // 전체 거치대 수
  
  // 메타데이터
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:**

```javascript
// 반경 검색을 위한 Geospatial 인덱스
db.stations.createIndex({ location: "2dsphere" })

// 정류소 ID로 빠른 조회
db.stations.createIndex({ stationId: 1 })

// 정류소명으로 검색
db.stations.createIndex({ name: "text" })
```

**예시 데이터:**

```json
{
  "_id": ObjectId("..."),
  "stationId": "10001",
  "name": "강남역 1번 출구",
  "district": "강남구",
  "location": {
    "type": "Point",
    "coordinates": [127.0276, 37.4979]
  },
  "totalRackCount": 25,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-04-29T10:30:00Z"
}
```

**쿼리 예시:**

```javascript
// 1. 모든 정류소 조회
db.stations.find({})

// 2. 특정 정류소 ID로 조회
db.stations.findOne({ stationId: "10001" })

// 3. 반경 내 정류소 조회 (Geospatial)
db.stations.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [127.0276, 37.4979] },
      $maxDistance: 500
    }
  }
})

// 4. 정류소명 검색 (텍스트 인덱스)
db.stations.find({ $text: { $search: "강남역" } })
```

---

### 2. `stationLogs` 컬렉션 (변화 히스토리)

**목적**: 매 주기마다 변화된 자전거 수 기록 (예측 로직용)

**스키마:**

```javascript
{
  _id: ObjectId,
  
  stationId: String,              // 정류소 ID (indexed)
  oldCount: Number,               // 이전 자전거 수
  newCount: Number,               // 현재 자전거 수
  delta: Number,                  // 변화량 (newCount - oldCount)
  
  // 변화 유형
  changeType: String,             // "RENTAL" | "RETURN"
  
  timestamp: Date,                // 기록 시간 (indexed)
  createdAt: Date                 // TTL 인덱스 적용 (1시간 후 자동 삭제)
}
```

**인덱스:**

```javascript
// 정류소별 최근 데이터 조회
db.stationLogs.createIndex({ stationId: 1, createdAt: -1 })

// TTL 인덱스 (1시간 = 3600초 후 자동 삭제)
db.stationLogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 })
```

**예시 데이터:**

```json
{
  "_id": ObjectId("..."),
  "stationId": "10001",
  "oldCount": 0,
  "newCount": 2,
  "delta": 2,
  "changeType": "RETURN",
  "timestamp": "2024-04-29T10:30:15Z",
  "createdAt": "2024-04-29T10:30:15Z"
}
```

**쿼리 예시:**

```javascript
// 1. 특정 정류소의 최근 15분 변화 조회 (예측용)
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000);
db.stationLogs.find({
  stationId: "10001",
  createdAt: { $gte: fifteenMinutesAgo }
}).sort({ createdAt: -1 })

// 2. 특정 정류소의 반납만 조회
db.stationLogs.find({
  stationId: "10001",
  changeType: "RETURN"
})

// 3. 가장 많이 변화하는 정류소 TOP 10
db.stationLogs.aggregate([
  { $match: { createdAt: { $gte: fifteenMinutesAgo } } },
  { $group: {
    _id: "$stationId",
    totalChanges: { $sum: 1 },
    avgDelta: { $avg: "$delta" }
  }},
  { $sort: { totalChanges: -1 } },
  { $limit: 10 }
])
```

---

### 3. `predictionLogs` 컬렉션 (예측 결과 기록)

**목적**: 예측 정확도 추적 및 모델 개선용

**스키마:**

```javascript
{
  _id: ObjectId,
  
  stationId: String,              // 정류소 ID
  
  // 예측 정보
  predictedAvailability: Number,  // 예측 확률 (0~100%)
  trend: String,                  // "UP" | "DOWN" | "STABLE"
  confidence: Number,             // 신뢰도 (0~1)
  
  // 실제 결과 (예측 후 일정 시간 뒤에 기록)
  actualAvailability: Number,     // 실제 확률
  accuracy: Number,               // 정확도
  
  timestamp: Date,
  createdAt: Date
}
```

**예시 데이터:**

```json
{
  "_id": ObjectId("..."),
  "stationId": "10001",
  "predictedAvailability": 0.85,
  "trend": "UP",
  "confidence": 0.92,
  "actualAvailability": 0.87,
  "accuracy": 0.98,
  "timestamp": "2024-04-29T10:30:15Z",
  "createdAt": "2024-04-29T10:30:15Z"
}
```

---

### 4. `userWatchlists` 컬렉션 (사용자 관심 정류소)

**목적**: 사용자가 모니터링하는 정류소 목록 저장

**스키마:**

```javascript
{
  _id: ObjectId,
  
  userId: String,                 // 사용자 ID (indexed)
  stationId: String,              // 정류소 ID (indexed)
  stationName: String,            // 정류소명 (UI용)
  
  // 모니터링 상태
  active: Boolean,                // 모니터링 활성 여부
  
  // 타임스탬프
  createdAt: Date,
  updatedAt: Date
}
```

**인덱스:**

```javascript
// 사용자별 관심 정류소 조회
db.userWatchlists.createIndex({ userId: 1 })

// 정류소별 모니터링 사용자 조회
db.userWatchlists.createIndex({ stationId: 1, active: 1 })

// 복합 인덱스 (조회 최적화)
db.userWatchlists.createIndex({ userId: 1, active: 1 })
```

**예시 데이터:**

```json
{
  "_id": ObjectId("..."),
  "userId": "user_123_google",
  "stationId": "10001",
  "stationName": "강남역 1번 출구",
  "active": true,
  "createdAt": "2024-04-29T09:00:00Z",
  "updatedAt": "2024-04-29T10:30:00Z"
}
```

**쿼리 예시:**

```javascript
// 1. 사용자의 모든 관심 정류소 조회
db.userWatchlists.find({ userId: "user_123_google", active: true })

// 2. 특정 정류소를 모니터링하는 모든 사용자 조회 (알림용)
db.userWatchlists.find({ stationId: "10001", active: true })
```

---

## ⚡ Redis 데이터 구조

Redis는 **메모리 기반 고속 캐시**로 사용됩니다. 30초마다 갱신되는 동적 데이터를 저장합니다.

### Key-Value 구조

#### 1. 정류소 자전거 수 캐싱

```
Key:   station:{stationId}
Value: {bikeCount}
Type:  String (Integer)
TTL:   3600초 (1시간)

예시:
station:10001 = "7"
station:10002 = "0"
station:10003 = "15"
```

**사용 예시 (Node.js):**

```javascript
const redis = require('redis');
const client = redis.createClient();

// 1. 저장
await client.set(`station:10001`, 7, 'EX', 3600);

// 2. 조회
const bikeCount = await client.get(`station:10001`);
console.log(bikeCount); // "7"

// 3. 증가
await client.incr(`station:10001`); // 8로 변경

// 4. 감소
await client.decr(`station:10001`); // 7로 변경

// 5. 일괄 조회
const keys = await client.keys(`station:*`);
const values = await client.mget(keys);
```

---

#### 2. 사용자 관심 정류소 리스트 (Set)

```
Key:   user:{userId}:watchlist
Type:  Set
Value: [stationId1, stationId2, ...]
TTL:   없음 (영구 저장)

예시:
user:user_123:watchlist = {"10001", "10002", "10015"}
```

**사용 예시:**

```javascript
// 1. 관심 정류소 추가
await client.sadd(`user:user_123:watchlist`, "10001");

// 2. 관심 정류소 조회
const watchlist = await client.smembers(`user:user_123:watchlist`);
console.log(watchlist); // ["10001", "10002", "10015"]

// 3. 관심 정류소 제거
await client.srem(`user:user_123:watchlist`, "10001");

// 4. 특정 정류소 모니터링 확인
const isWatching = await client.sismember(`user:user_123:watchlist`, "10001");
console.log(isWatching); // true/false
```

---

#### 3. 실시간 알림 큐 (Stream) - 선택사항

```
Key:   stream:notifications
Type:  Stream
Value: {userId, stationId, message, timestamp}
TTL:   24시간

예시:
Entry 1: {userId: "user_123", stationId: "10001", message: "자전거 입고!", timestamp: "2024-04-29T10:30:15Z"}
Entry 2: {userId: "user_456", stationId: "10002", message: "자전거 완전 가득!", timestamp: "2024-04-29T10:30:20Z"}
```

---

## 🔄 데이터 흐름 예시

### 시나리오: 강남역 1번 출구 (stationId: 10001)에서 자전거 반납 발생

```
T-0초: API 호출
└─ "강남역: 0대 → 2대" 반환

T+1초: Diffing 실행
├─ Redis 조회: station:10001 = "0"
├─ 변화 감지: 0 ≠ 2
└─ 이벤트 발생

T+2초: 데이터 저장
├─ MongoDB StationLog 저장
│  └─ { stationId: "10001", oldCount: 0, newCount: 2, changeType: "RETURN" }
└─ Redis 업데이트
   └─ station:10001 = "2"

T+3초: 예측 계산
├─ MongoDB 쿼리: 최근 15분 stationLogs
├─ 분석: 최근 반납 추세 UP
└─ 확률: 85% (3분 내 대여 가능)

T+4초: 알림 발송
├─ MongoDB 쿼리: 10001을 모니터링하는 사용자
│  └─ ["user_123", "user_456", ...]
└─ WebSocket 전송
   └─ 각 사용자에게 "강남역에서 자전거 입고됨!" 알림
```

---

## 📈 성능 최적화 팁

### 1. 인덱스 설계

```javascript
// ❌ 나쁜 예: 인덱스 없음
db.stationLogs.find({ stationId: "10001" })
// → Full collection scan (느림)

// ✅ 좋은 예: 복합 인덱스
db.stationLogs.createIndex({ stationId: 1, createdAt: -1 })
// → B-tree 검색 (빠름)
```

### 2. TTL 인덱스 활용

```javascript
// 1시간 뒤 자동 삭제 (저장소 최적화)
db.stationLogs.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 3600 }
)
```

### 3. Redis 파이프라이닝

```javascript
// ❌ 나쁜 예: 개별 요청
for (let i = 0; i < 100; i++) {
  await client.set(`station:${i}`, someValue);
}
// → 100개의 네트워크 라운드트립

// ✅ 좋은 예: 파이프라이닝
const pipeline = client.multi();
for (let i = 0; i < 100; i++) {
  pipeline.set(`station:${i}`, someValue);
}
await pipeline.exec();
// → 1번의 네트워크 라운드트립
```

---

## 🗂️ 데이터 관리

### 백업

```bash
# MongoDB 백업
mongodump --uri="mongodb+srv://..." --out=./backup

# Redis 백업
redis-cli BGSAVE
```

### 모니터링

```bash
# MongoDB 연결 확인
mongosh "mongodb+srv://..."

# Redis 연결 확인
redis-cli ping
# PONG
```

---

## 🎓 요약

| 저장소 | 용도 | 데이터 특성 | 응답 시간 |
|--------|------|-----------|---------|
| **MongoDB** | 정류소 정보, 히스토리 | 정적, 큼 | 50~100ms |
| **Redis** | 실시간 상태 캐시 | 동적, 작음 | 1~10ms |

이 구조를 통해 **대규모 데이터**는 MongoDB에, **빈번한 조회**는 Redis에 저장하여 성능을 극대화합니다.
