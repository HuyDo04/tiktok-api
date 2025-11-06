
const streamService = require('../services/stream.service');

class StreamController {
  async createStream(req, res, next) {
    try {
      const { title } = req.body;
      const hostId = req.user.id;
      const stream = await streamService.createStream(hostId, title);
      res.status(201).json(stream);
    } catch (error) {
      next(error);
    }
  }

  async getLiveStreams(req, res, next) {
    try {
      const streams = await streamService.getLiveStreams();
      res.status(200).json(streams);
    } catch (error) {
      next(error);
    }
  }

  async getStreamById(req, res, next) {
    try {
      const stream = await streamService.getStreamById(req.params.id);
      if (!stream) {
        return res.status(404).json({ message: 'Livestream not found' });
      }
      res.status(200).json(stream);
    } catch (error) {
      next(error);
    }
  }

  async endStream(req, res, next) {
    try {
      const hostId = req.user.id;
      const stream = await streamService.endStream(req.params.id, hostId);
      res.status(200).json({ message: 'Livestream ended', stream });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new StreamController();
