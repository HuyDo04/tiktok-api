const authService = require("@/service/auth.service");
const { verifyToken } = require("@/utils/jwt");

const checkAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

      
    if (!token) {
      return res.status(401).json({ message: "Token does not exist" });
    }

    const payload = verifyToken(token);
    
    if (!payload || !payload.data?.userId) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await authService.getById(payload.data.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = checkAuth;
