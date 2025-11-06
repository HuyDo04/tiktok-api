const {RefreshToken} = require("@/models");

const generateToken = require("./generateToken");

const generateUniqueToken = async () => {
    let randomToken = null;

    do {
        randomToken = generateToken();
    } while (
        await RefreshToken.findOne({
            where: {
                token: randomToken
            }
        })
    );

    return randomToken;
};

module.exports = generateUniqueToken;