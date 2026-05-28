# Backend Dockerfile
FROM node:20-alpine

# 시간대 설정 (KST)
RUN apk add --no-cache tzdata
ENV TZ=Asia/Seoul

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
# devDependencies는 제외하고 설치
RUN npm install --production

# 소스 코드 복사
COPY . .

# 환경 변수 기본값 설정
ENV NODE_ENV=production
ENV PORT=5000

# 포트 설정
EXPOSE 5000

# 서버 실행
CMD ["node", "src/app.js"]
