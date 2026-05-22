/**
 * User 모델 (MongoDB 스키마)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - username
 *       properties:
 *         _id:
 *           type: string
 *           description: 자동 생성되는 사용자 고유 ID
 *         email:
 *           type: string
 *           format: email
 *           description: 사용자 이메일 (로그인 아이디)
 *         username:
 *           type: string
 *           description: 사용자 이름
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: 권한
 *         createdAt:
 *           type: string
 *           format: date-time
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, '이메일은 필수 입력 항목입니다.'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, '유효한 이메일 형식이 아닙니다.']
        },
        password: {
            type: String,
            required: [
                function () { return this.socialProvider === 'local'; },
                '일반 가입 시 비밀번호는 필수 입력 항목입니다.'
            ],
            minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다.']
        },
        username: {
            type: String,
            required: [true, '사용자 이름은 필수 입력 항목입니다.'],
            trim: true
        },
        socialProvider: {
            type: String,
            enum: ['local', 'kakao', 'google'],
            default: 'local'
        },
        socialId: {
            type: String,
            default: null,
            index: true // 검색 최적화를 위해 인덱스 추가
        },
        phone: {
            type: String,
            default: '-'
        },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user'
        },
        activePass: {
            type: String, // 예: 'DAILY_1H', 'REGULAR_30D_1H' 등
            default: null
        },
        passBaseMinutes: {
            type: Number, // 1회 기본 대여 시간 (60, 120 등)
            default: 0
        },
        passExpiresAt: {
            type: Date,   // 이용권의 최종 만료 일시
            default: null
        },
        notificationSettings: {
            sniping: { type: Boolean, default: true },   // 관심 정류소 입고 알림
            trip: { type: Boolean, default: true },      // 대여/반납 및 결제 안내
            marketing: { type: Boolean, default: false }, // 마케팅 및 이벤트
            dnd: {
                enabled: { type: Boolean, default: false },
                startTime: { type: String, default: '23:00' },
                endTime: { type: String, default: '07:00' }
            }
        },
        pushToken: { type: String, default: null } // Web Push or FCM Token
    },
    {
        timestamps: true // createdAt, updatedAt 자동 생성
    }
);

// [보안] 저장 전 비밀번호 암호화 (Hashing)
userSchema.pre('save', async function (next) {
    const user = this;

    // 비밀번호가 수정된 경우에만 해싱 진행
    if (!user.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(user.password, salt);
        user.password = hash;
        next();
    } catch (error) {
        next(error);
    }
});

// 비밀번호 검증 메서드
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
