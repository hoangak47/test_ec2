const router = require("express").Router();

const {
  createChatRoom,
  getChatRoom,
  getAllChatRoom,
  leaveChatRoom,
} = require("../controllers/chat.controller");
const middleware = require("../controllers/middleware");

router.post("/create", middleware.checkToken, createChatRoom);
router.get("/:id", middleware.checkToken, getChatRoom);
router.get("/", middleware.checkToken, getAllChatRoom);
router.put("/leave", middleware.checkToken, leaveChatRoom);

module.exports = router;
