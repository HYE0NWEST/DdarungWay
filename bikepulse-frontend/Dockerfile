# 1. Build stage
FROM node:20-alpine AS build

WORKDIR /app

# 패키지 파일 복사 및 설치
COPY package*.json ./
RUN npm install

# 빌드 시점에 환경 변수를 주입하기 위한 설정
ARG VITE_API_BASE_URL
ARG VITE_KAKAO_MAP_APP_KEY
ARG VITE_TOSS_CLIENT_KEY

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KAKAO_MAP_APP_KEY=$VITE_KAKAO_MAP_APP_KEY
ENV VITE_TOSS_CLIENT_KEY=$VITE_TOSS_CLIENT_KEY

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 2. Production stage (Nginx)
FROM nginx:stable-alpine

# 빌드된 결과물을 nginx로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정을 파일로 직접 생성 (SPA 라우팅 지원 및 안정적인 문법)
RUN printf "server { \n\
    listen 80; \n\
    location / { \n\
        root /usr/share/nginx/html; \n\
        index index.html index.htm; \n\
        try_files \$uri \$uri/ /index.html; \n\
    } \n\
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|otf|ttc)\$ { \n\
        root /usr/share/nginx/html; \n\
        expires 6M; \n\
        access_log off; \n\
        add_header Cache-Control \"public\"; \n\
    } \n\
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
