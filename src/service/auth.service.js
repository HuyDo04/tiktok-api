const {User} = require("@/models")
const { where, attributes } = require("sequelize")

exports.create = async (data) => {
    const user = await User.create(data)
    return user
}

exports.getById = async (id) => {
    const user = await User.findByPk(id)    
    
    return user
}

exports.getSafeUser = async (id) => {
    const user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'verify_token', 'verify_token_expires_at', 'reset_password_otp', 'reset_password_otp_expires_at'] }
    });
    
    return user;
}

exports.getByEmail = async (email) => {
    const user = await User.findOne({
        where: {
            email
        },
        // attributes:["email",]
    })    
    return user
}

exports.findByProvider = async (provider, providerId) => {
    const user = await User.findOne({
        where: {
            provider,
            providerId
        }
    });
    return user;
};

exports.update = async (id, data) => {
    const user = await User.findByPk(id);
        
    if(!user) return null
    const newUser = await User.update(data,{
        where: {id}
    })
    return newUser
} 

exports.delete = async (id) => {
    const deleted = await User.destroy({
        where: {id}
    })
    return deleted
}
