const jwt = require("jsonwebtoken");

const MAIL_JWT_SECRET = process.env.MAIL_JWT_SECRET;
const expiresDefault = "2d";

exports.signToken = (payload, expiresIn = expiresDefault) => {
    const token = jwt.sign(payload, MAIL_JWT_SECRET, {expiresIn});
    return token
}

exports.createToken = (payload, options) => {
    const token = jwt.sign(payload, MAIL_JWT_SECRET,options);
    return token;
}

exports.verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, MAIL_JWT_SECRET);
        return {
            success: true,
            data: decoded
        }
    } catch (error) {
        return {
            success: false,
            message: error.message
        }
    }
}