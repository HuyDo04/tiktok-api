'use strict';

const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const authService = require('@/service/auth.service');
const refreshTokenService = require('@/service/refreshToken.service');
const { signToken } = require('@/utils/jwt');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Shared function to handle user lookup, creation, and linking
const findOrCreateUser = async ({ provider, providerId, email, username, avatar }) => {
  let user = await authService.findByProvider(provider, providerId);
  if (user) {
    return user;
  }

  user = await authService.getByEmail(email);
  if (user) {
    // User exists, link the new provider
    const updatedData = { ...user, provider, providerId };
    if (avatar && !user.avatar) {
        updatedData.avatar = avatar;
    }
    await authService.update(user.id, updatedData);
    return await authService.getById(user.id); // Re-fetch to get the full updated user
  }

  // User does not exist, create a new one
  const newUser = await authService.create({
    email,
    username,
    provider,
    providerId,
    avatar,
    verified_at: new Date(), // Mark as verified
  });

  return newUser;
};

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) {
      return res.status(400).json({ message: 'Google ID token is required.' });
    }

    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: providerId, email, name: username, picture: avatar } = payload;

    const user = await findOrCreateUser({
      provider: 'google',
      providerId,
      email,
      username,
      avatar,
    });

    // Issue tokens
    const accessToken = signToken({ userId: user.id });
    const refreshToken = await refreshTokenService.createRefreshToken(user.id);

    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken.token,
      token_type: 'Bearer',
      expires_in: 3600, // Corresponds to the default in your project
      user,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
};

// Facebook Login
exports.facebookLogin = async (req, res) => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ message: 'Facebook access token is required.' });
    }

    const { data } = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${access_token}`
    );

    const { id: providerId, name: username, email, picture } = data;
    const avatar = picture?.data?.url;

    if (!email) {
        return res.status(400).json({ message: 'Facebook account must have a public email.' });
    }

    const user = await findOrCreateUser({
      provider: 'facebook',
      providerId,
      email,
      username,
      avatar,
    });

    // Issue tokens
    const accessToken = signToken({ userId: user.id });
    const refreshToken = await refreshTokenService.createRefreshToken(user.id);

    res.status(200).json({
      access_token: accessToken,
      refresh_token: refreshToken.token,
      token_type: 'Bearer',
      expires_in: 3600,
      user,
    });
  } catch (error) {
    console.error('Facebook login error:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Authentication failed. Please try again.' });
  }
};
