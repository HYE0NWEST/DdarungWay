/**
 * Auth 컨트롤러
 * 회원가입, 로그인, 토큰 갱신, 로그아웃 (이중 토큰 & Redis 적용)
 */

const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis'); // Redis 클라이언트 임포트

// 1️⃣ Access Token 생성 함수 (짧은 수명: 예 - 1시간)
const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// 2️⃣ Refresh Token 생성 함수 (긴 수명: 예 - 14일)
const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    });
};

/**
 * 🆕 카카오 OAuth 로그인
 * POST /api/auth/kakao
 */
exports.kakaoLogin = async (req, res) => {
    try {
        const { code } = req.body; // 프론트엔드에서 넘겨준 인가 코드

        if (!code) {
            return res.status(400).json({ status: 'fail', message: '인가 코드가 필요합니다.' });
        }

        // 1. 인가 코드로 카카오 토큰 요청
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('client_id', process.env.KAKAO_CLIENT_ID);
        tokenParams.append('redirect_uri', process.env.KAKAO_REDIRECT_URI);
        tokenParams.append('code', code);

        const tokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', tokenParams, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }
        });

        const kakaoAccessToken = tokenResponse.data.access_token;

        // 2. 카카오 엑세스 토큰으로 사용자 정보 요청
        const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: { Authorization: `Bearer ${kakaoAccessToken}` }
        });

        const { id, kakao_account } = userResponse.data;
        
        // 이메일 권한이 없을 경우 socialId 기반의 시스템용 고유 식별자 생성
        // (DB 스키마의 unique 제약조건을 만족시키기 위함)
        const socialId = String(id);
        const email = kakao_account?.email || `${socialId}@kakao.auth`; 
        const username = kakao_account?.profile?.nickname || '카카오 사용자';

        // 3. DB에서 유저 확인 (socialId 기준 우선 조회)
        let user = await User.findOne({ socialId, socialProvider: 'kakao' });

        // 만약 socialId로 못 찾았다면 이메일로 매칭 시도 (기존 유저 연동 대비)
        if (!user && kakao_account?.email) {
            user = await User.findOne({ email: kakao_account.email });
        }

        if (!user) {
            // 신규 유저 생성
            user = await User.create({
                email,
                username,
                socialId,
                socialProvider: 'kakao'
            });
        } else {
            // 기존 유저 정보 업데이트 (닉네임 등)
            if (kakao_account?.profile?.nickname) {
                user.username = kakao_account.profile.nickname;
            }
            await user.save();
        }

        // 4. 서비스 자체 토큰 발급
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Redis 저장
        const redisClient = getRedisClient();
        if (redisClient) {
            await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 1209600 });
        }

        res.status(200).json({
            status: 'success',
            accessToken,
            refreshToken,
            data: { user }
        });
    } catch (error) {
        const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        logger.error(`Kakao Login Error: ${errorDetail}`);
        res.status(500).json({ status: 'error', message: `카카오 로그인 처리 중 오류가 발생했습니다. (${error.message})` });
    }
};

/**
 * 🆕 구글 OAuth 리다이렉트
 * GET /api/auth/google
 */
exports.redirectToGoogle = (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=email profile`;
    res.redirect(url);
};

/**
 * 🆕 카카오 OAuth 리다이렉트
 * GET /api/auth/kakao
 */
exports.redirectToKakao = (req, res) => {
    // 환경변수 이름은 .env에 설정하신 카카오 API 키 이름으로 맞춰주세요!
    const clientId = process.env.KAKAO_REST_API_KEY || process.env.KAKAO_CLIENT_ID || process.env.KAKAO_MAP_API_KEY;
    const redirectUri = process.env.KAKAO_REDIRECT_URI;
    
    // account_email 제거 (사용자 권한 문제로 KOE205 발생 방지)
    const url = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=profile_nickname`;
    res.redirect(url);
};

/**
 * 🆕 구글 OAuth 콜백 (인가 코드를 프론트엔드로 전달)
 */
exports.googleLoginCallback = (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    logger.info(`[OAuth] Google Code Received, Redirecting to Frontend`);
    res.redirect(`${frontendUrl}/auth/google/callback?code=${code}`);
};

/**
 * 🆕 카카오 OAuth 콜백 (인가 코드를 프론트엔드로 전달)
 */
exports.kakaoLoginCallback = (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    logger.info(`[OAuth] Kakao Code Received, Redirecting to Frontend`);
    res.redirect(`${frontendUrl}/auth/kakao/callback?code=${code}`);
};

/**
 * 🆕 구글 OAuth 로그인
 * POST /api/auth/google
 */
exports.googleLogin = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ status: 'fail', message: '인가 코드가 필요합니다.' });
        }

        // 1. 구글 토큰 요청
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const { access_token } = tokenResponse.data;

        // 2. 구글 사용자 정보 요청
        const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const { id, email, name } = userResponse.data;

        // 3. DB에서 유저 확인
        let user = await User.findOne({ $or: [{ socialId: id }, { email }] });

        if (!user) {
            user = await User.create({
                email,
                username: name || email.split('@')[0],
                socialId: id,
                socialProvider: 'google'
            });
        } else if (user.socialProvider === 'local') {
            user.socialId = id;
            user.socialProvider = 'google';
            await user.save();
        }

        // 4. 서비스 토큰 발급
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        const redisClient = getRedisClient();
        if (redisClient) {
            await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 1209600 });
        }

        res.status(200).json({
            status: 'success',
            accessToken,
            refreshToken,
            data: { user }
        });
    } catch (error) {
        logger.error('Google Login Error:', error.response?.data || error.message);
        res.status(500).json({ status: 'error', message: '구글 로그인 처리 중 오류가 발생했습니다.' });
    }
};

/**
 * 회원가입
 * POST /api/auth/signup
 */
exports.signup = async (req, res) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ status: 'fail', message: '이메일, 비밀번호, 이름을 모두 입력해주세요.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ status: 'fail', message: '이미 가입된 이메일입니다.' });
        }

        const user = await User.create({
            email,
            password,
            username
        });

        // 토큰 발급
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        const redisClient = getRedisClient();
        if (redisClient) {
            await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 1209600 });
        }

        user.password = undefined;

        res.status(201).json({
            status: 'success',
            accessToken,
            refreshToken,
            data: { user }
        });
    } catch (error) {
        logger.error('Signup Error:', error);
        res.status(500).json({ status: 'error', message: '회원가입 중 오류가 발생했습니다.' });
    }
};

/**
 * 로그인
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: 'fail', message: '이메일과 비밀번호를 모두 입력해주세요.' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ status: 'fail', message: '이메일 또는 비밀번호가 일치하지 않습니다.' });
        }

        // 🌟 두 종류의 토큰 발급
        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // 🌟 Redis에 Refresh Token 저장 (TTL: 14일 = 1209600초)
        const redisClient = getRedisClient();
        if (redisClient) {
            await redisClient.set(`refreshToken:${user._id}`, refreshToken, { EX: 1209600 });
        }

        user.password = undefined;

        res.status(200).json({
            status: 'success',
            accessToken,
            refreshToken, // 프론트엔드는 이 값을 안전한 곳(Secure Cookie 등)에 보관해야 함
            data: { user }
        });
    } catch (error) {
        logger.error('Login Error:', error);
        res.status(500).json({ status: 'error', message: '로그인 중 오류가 발생했습니다.' });
    }
};

/**
 * 🆕 Access Token 재발급
 * POST /api/auth/refresh
 */
exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ status: 'fail', message: 'Refresh Token이 필요합니다.' });
        }

        // 1. Refresh Token 자체의 유효성 검증 (만료/서명 확인)
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(401).json({ status: 'fail', message: 'Refresh Token이 만료되었거나 유효하지 않습니다.' });
        }

        const userId = decoded.id;

        // 2. Redis에 저장된 토큰과 일치하는지 확인 (탈취/로그아웃 여부 검증)
        const redisClient = getRedisClient();
        const storedToken = await redisClient.get(`refreshToken:${userId}`);

        if (storedToken !== refreshToken) {
            return res.status(401).json({ status: 'fail', message: '유효하지 않거나 로그아웃된 토큰입니다. 다시 로그인해주세요.' });
        }

        // 3. 검증 통과 시 새로운 Access Token 발급
        const newAccessToken = generateAccessToken(userId);

        res.status(200).json({
            status: 'success',
            accessToken: newAccessToken
        });
    } catch (error) {
        logger.error('Token Refresh Error:', error);
        res.status(500).json({ status: 'error', message: '토큰 갱신 중 오류가 발생했습니다.' });
    }
};

/**
 * 🆕 로그아웃 (Redis에서 Refresh Token 삭제)
 * POST /api/auth/logout (보호된 라우트)
 */
exports.logout = async (req, res) => {
    try {
        // ✅ [권한 강화] 요청 헤더의 토큰에서 사용자 ID 추출
        const userId = req.user.id; // protect 미들웨어에서 이미 검증됨

        const redisClient = getRedisClient();
        if (redisClient) {
            await redisClient.del(`refreshToken:${userId}`); // Redis에서 삭제하여 토큰 무효화
        }

        res.status(200).json({ status: 'success', message: '성공적으로 로그아웃 되었습니다.' });
    } catch (error) {
        logger.error('Logout Error:', error);
        res.status(500).json({ status: 'error', message: '로그아웃 처리 중 오류가 발생했습니다.' });
    }
};