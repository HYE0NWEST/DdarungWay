# 1. Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
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
COPY --from=build /app/dist /usr/share/nginx/html

# ✅ 핵심: 설정 파일을 Nginx 설정 폴더로 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
