# 1. Build stage
FROM node:20-alpine AS build

WORKDIR /app

# 루트의 패키지 파일이 아닌 프론트엔드 폴더 내의 파일 복사
COPY package*.json ./
RUN npm install

# 빌드 시점에 환경 변수를 주입하기 위한 설정
ARG VITE_API_BASE_URL
ARG VITE_KAKAO_MAP_APP_KEY
ARG VITE_TOSS_CLIENT_KEY

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_KAKAO_MAP_APP_KEY=$VITE_KAKAO_MAP_APP_KEY
ENV VITE_TOSS_CLIENT_KEY=$VITE_TOSS_CLIENT_KEY

COPY . .
RUN npm run build

# 2. Production stage (Nginx)
FROM nginx:stable-alpine

# 빌드된 결과물을 nginx로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 (SPA 라우팅 지원 및 보안 설정)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    # 캐시 설정 \
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff2?|eot|ttf|otf|ttc)$ { \
        root /usr/share/nginx/html; \
        expires 6M; \
        access_log off; \
        add_header Cache-Control "public"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
