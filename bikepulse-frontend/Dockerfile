# 1. Build stage
FROM node:20-alpine AS build

WORKDIR /app

# 루트의 패키지 파일이 아닌 프론트엔드 폴더 내의 파일 복사
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# 2. Production stage (Nginx)
FROM nginx:stable-alpine

# 빌드된 결과물을 nginx로 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 (SPA 라우팅 지원을 위해 필요할 수 있음)
RUN echo "server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
