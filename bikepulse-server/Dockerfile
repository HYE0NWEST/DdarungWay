FROM node:20-alpine

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install --production

# 소스 코드 복사
COPY . .

# 포트 설정
EXPOSE 5000

# 서버 실행
CMD ["node", "src/app.js"]
