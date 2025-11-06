const generateUniqueToken = require("@/utils/generateUniqueToken");
const {RefreshToken} = require("@/models")

exports.createRefreshToken = async (userId) => {
    const token = await generateUniqueToken();

    const expiredDate = new Date();
    expiredDate.setMonth(expiredDate.getMonth() + 1); // +1 month

    const refreshToken = await RefreshToken.create({
        user_id: userId,
        token,
        expired_at: expiredDate
    });

    return refreshToken;
};

exports.getByToken = async (token) => {
    return await RefreshToken.findOne({
        where: {
            token: token
        }
    })
}

exports.removeByToken = async (token) => {
  await RefreshToken.destroy({ where: { token } });
};

