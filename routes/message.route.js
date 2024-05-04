const router = require("express").Router();

const {
  getMessages,
  sendMessage,
} = require("../controllers/message.controller");

const middleware = require("../controllers/middleware");

router.get("/:id/:page", middleware.checkToken, getMessages);
router.post("/:id", middleware.checkToken, sendMessage);

module.exports = router;
