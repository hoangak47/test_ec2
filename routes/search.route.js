const router = require("express").Router();

const middleware = require("../controllers/middleware");
const { search } = require("../controllers/search.controller.js");

router.get("/", middleware.checkToken, search);
// router.get("/", search);

module.exports = router;
