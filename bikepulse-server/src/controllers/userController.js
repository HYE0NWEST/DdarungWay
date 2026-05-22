/**
 * User Controller - 관심 정류소 등록 및 관리
 */
const UserWatchlist = require('../models/UserWatchlist');
const User = require('../models/User');
const logger = require('../utils/logger');

// 0️⃣ 사용자 프로필 조회
const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                email: user.email,
                name: user.username,
                phone: user.phone || '-',
                socialProvider: user.socialProvider, // ✅ 소셜 제공자 정보 추가
                activePass: user.activePass,
                passBaseMinutes: user.passBaseMinutes,
                passExpiresAt: user.passExpiresAt,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        logger.error('[UserController] 프로필 조회 실패:', error.message);
        res.status(500).json({ success: false, message: '프로필 조회에 실패했습니다.' });
    }
};

// 1. 관심 정류소 등록/해제 (스나이핑 토글)
const toggleWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { stationId, stationName } = req.body;

        if (!stationId) {
            return res.status(400).json({ success: false, message: 'stationId가 필요합니다.' });
        }

        // 1) 해당 유저가 이 정류소를 등록한 적이 있는지 찾습니다.
        let watchlistItem = await UserWatchlist.findOne({ userId, stationId });

        if (watchlistItem) {
            // 2) 이미 있다면 상태를 반전시킵니다. (켜져있으면 끄고, 꺼져있으면 켬)
            watchlistItem.active = !watchlistItem.active;
            watchlistItem.updatedAt = new Date();
            await watchlistItem.save();

            const statusMsg = watchlistItem.active ? '모니터링 시작' : '모니터링 해제';
            logger.info(`[UserController] 사용자 ${userId} - 정류소 ${stationId} ${statusMsg}`);

            return res.status(200).json({ success: true, message: statusMsg, data: watchlistItem });
        } else {
            // 3) 아예 등록한 적이 없으면 새로 만듭니다. (기본으로 알람 ON)
            watchlistItem = await UserWatchlist.create({
                userId,
                stationId,
                stationName,
                active: true
            });

            logger.info(`[UserController] 사용자 ${userId} - 정류소 ${stationId} 모니터링 시작 (신규)`);
            return res.status(201).json({ success: true, message: '모니터링 시작', data: watchlistItem });
        }

    } catch (error) {
        logger.error('[UserController] 관심 정류소 등록 실패:', error.message);
        res.status(500).json({ success: false, message: '등록에 실패했습니다.' });
    }
};

// 2. 관심 정류소 목록 조회
const getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;

        // active가 true(알람 켜짐)인 것만 최신순으로 가져옵니다.
        const watchlist = await UserWatchlist.find({ userId, active: true })
            .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, count: watchlist.length, data: watchlist });
    } catch (error) {
        logger.error('[UserController] 관심 정류소 조회 실패:', error.message);
        res.status(500).json({ success: false, message: '목록 조회에 실패했습니다.' });
    }
};

// 0️⃣ 사용자 프로필 수정 (닉네임 변경 등)
const updateUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ success: false, message: '변경할 이름을 입력해주세요.' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { username },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        res.status(200).json({
            success: true,
            message: '프로필이 성공적으로 업데이트되었습니다.',
            data: user
        });
    } catch (error) {
        logger.error('[UserController] 프로필 수정 실패:', error.message);
        res.status(500).json({ success: false, message: '프로필 수정에 실패했습니다.' });
    }
};

// 0️⃣ 사용자 비밀번호 변경
const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        // 현재 비밀번호 확인
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
        }

        // 새 비밀번호 설정 (모델의 pre-save hook이 해싱 처리함)
        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: '비밀번호가 성공적으로 변경되었습니다.'
        });
    } catch (error) {
        logger.error('[UserController] 비밀번호 변경 실패:', error.message);
        res.status(500).json({ success: false, message: '비밀번호 변경에 실패했습니다.' });
    }
};

module.exports = { getUserProfile, updateUserProfile, updatePassword, toggleWatchlist, getWatchlist };