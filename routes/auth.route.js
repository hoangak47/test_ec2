const router = require("express").Router();

const {
  login,
  register,
  logout,
  refreshToken,
  getFriends,
} = require("../controllers/auth.controller");
const middleware = require("../controllers/middleware");

router.post("/login", login);
router.post("/register", register);
router.get("/logout", middleware.checkToken, logout);
router.get("/refresh-token", refreshToken);
router.get("/friends", middleware.checkToken, getFriends);

module.exports = router;
