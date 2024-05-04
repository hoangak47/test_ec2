const jwt = require("jsonwebtoken");

const middleware = {
  checkToken: async (req, res, next) => {
    const id = req.query.id || req.headers["id"];

    const accessToken = req.headers["x-access-token"];

    if (!accessToken) {
      return res.status(400).send({
        message: "Access token not found",
      });
    }

    jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          return res.status(401).send({
            message: "Unauthorized",
          });
        }

        if (id !== decoded.id) {
          return res.status(401).send({
            message: "Access token not valid",
          });
        }

        next();
      }
    );
  },
};

module.exports = middleware;
