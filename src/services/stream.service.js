
const { Livestream, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

class StreamService {
  async createStream(hostId, title) {
    const stream = await Livestream.create({
      title,
      hostId,
      roomId: uuidv4(),
    });
    return stream;
  }

  async getLiveStreams() {
    const streams = await Livestream.findAll({
      where: { status: 'live' },
      include: {
        model: User,
        as: 'host',
        attributes: ['id', 'username', 'avatar'],
      },
      order: [['startedAt', 'DESC']],
    });
    return streams;
  }

  async getStreamById(id) {
    const stream = await Livestream.findOne({
      where: { id, status: 'live' },
      include: {
        model: User,
        as: 'host',
        attributes: ['id', 'username', 'avatar'],
      },
    });
    return stream;
  }

  async endStream(id, hostId) {
    const stream = await Livestream.findOne({ where: { id, hostId } });

    if (!stream) {
      throw new Error('Livestream not found or you are not the host');
    }

    stream.status = 'ended';
    stream.endedAt = new Date();
    await stream.save();

    return stream;
  }
}

module.exports = new StreamService();
