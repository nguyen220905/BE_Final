const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET; 

const authMiddleware = (req, res, next) => {

  const authHeader = req.headers["authorization"];
  
  if (!authHeader) {
    return res.status(401).send("Unauthorized: Không tìm thấy Token");
  }

 
  const token = authHeader.split(" ")[1];

  try {
 
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(401).send("Unauthorized: Token sai hoặc đã hết hạn");
  }
};

module.exports = authMiddleware;