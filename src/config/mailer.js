const nodemailer = require("nodemailer");
const pass = process.env.PASS_MAILER;
const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: false,
    auth: {
        user: "huydo04122001@gmail.com",
        pass: pass,
    }
})

module.exports = transporter