const { Session } = require("@/models");

exports.findBySid = async (sid) => {
  const session = await Session.findOne({ where: { sid } });
  return session ? session.toJSON() : null;
};

exports.create = async (data) => {
  const session = await Session.create({
    ...data,
    data: "{}", 
  });
  return session.toJSON();
};

exports.remove = async (sid) => {
  const deletedCount = await Session.destroy({ where: { sid } });
  return deletedCount > 0;
};

exports.update = async (sid, data) => {
  await Session.update(data, { where: { sid } });
  const updated = await Session.findOne({ where: { sid } });
  return updated ? updated.toJSON() : null;
};
