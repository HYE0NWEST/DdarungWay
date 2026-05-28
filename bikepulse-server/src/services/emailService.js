const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Brevo SMTP 설정 (환경 변수에서 읽어옴)
const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
    port: process.env.BREVO_SMTP_PORT || 587,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
    },
});

/**
 * 인증번호 메일 발송
 * @param {string} email 수신자 이메일
 * @param {string} code 6자리 인증번호
 */
exports.sendVerificationEmail = async (email, code) => {
    // 안전 장치: 환경 변수가 없으면 발송 시뮬레이션만 수행
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
        logger.warn('⚠️ Brevo 환경 변수가 설정되지 않았습니다. 메일 발송을 건너뜁니다.');
        logger.info(`[시뮬레이션] ${email}님께 보낼 인증번호: ${code}`);
        return true; 
    }

    const mailOptions = {
        from: `"BikePulse" <hsys20020702@gmail.com>`,
        to: email,
        subject: '[BikePulse] 회원가입 이메일 인증번호',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4CAF50; text-align: center;">이메일 인증을 완료해주세요</h2>
                <p>안녕하세요! BikePulse 회원가입을 위해 아래의 인증번호를 입력해주세요.</p>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 30px; font-weight: bold; letter-spacing: 5px; color: #333; margin: 20px 0; border-radius: 5px;">
                    ${code}
                </div>
                <p style="color: #ff4444; font-size: 14px;">* 이 인증번호는 3분(180초) 동안 유효합니다.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">본 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`✅ 인증 메일 발송 성공: ${email}`);
        return true;
    } catch (error) {
        logger.error(`❌ 인증 메일 발송 실패: ${error.message}`);
        // 메일 발송 실패가 서버 전체 중단으로 이어지지 않게 처리
        return false;
    }
};

/**
 * 임시 비밀번호 발송
 * @param {string} email 수신자 이메일
 * @param {string} tempPassword 발급된 임시 비밀번호
 */
exports.sendTemporaryPasswordEmail = async (email, tempPassword) => {
    // 안전 장치: 환경 변수가 없으면 발송 시뮬레이션만 수행
    if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
        logger.warn('⚠️ Brevo 환경 변수가 설정되지 않았습니다. 임시 비밀번호 메일 발송을 건너뜁니다.');
        logger.info(`[시뮬레이션] ${email}님께 보낼 임시 비밀번호: ${tempPassword}`);
        return true; 
    }

    const mailOptions = {
        from: `"BikePulse" <${process.env.BREVO_SMTP_USER}>`,
        to: email,
        subject: '[BikePulse] 임시 비밀번호가 발급되었습니다',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                <h2 style="color: #4CAF50; text-align: center;">임시 비밀번호 발급 안내</h2>
                <p>안녕하세요! 요청하신 임시 비밀번호가 발급되었습니다. 아래의 비밀번호로 로그인하신 후, 반드시 새 비밀번호로 변경해주시기 바랍니다.</p>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333; margin: 20px 0; border-radius: 5px;">
                    ${tempPassword}
                </div>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888; text-align: center;">본 메일은 발신 전용입니다. 문의사항은 고객센터를 이용해주세요.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`✅ 임시 비밀번호 발송 성공: ${email}`);
        return true;
    } catch (error) {
        logger.error(`❌ 임시 비밀번호 발송 실패: ${error.message}`);
        return false;
    }
};
