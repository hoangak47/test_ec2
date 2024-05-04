const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const http = require("http");
const SocketIo = require("./utils/socket");

const url =
  process.env.NODE_ENV === "production"
    ? process.env.URL
    : "http://localhost:3000";

const app = express();
const server = http.createServer(app);
const socketIo = require("socket.io")(server, {
  cors: {
    origin: url,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

SocketIo(socketIo);

app.use(express.json());
app.use(cookieParser());
dotenv.config();

app.use(
  cors({
    origin: url,
    credentials: true,
  })
);

mongoose.connect(process.env.MONGODB_URL);

// const connection = mongoose.connection;

// connection.once("open", () => {
//   console.log("MongoDB connection established successfully");
// });

app.use("/api/v1/auth", require("./routes/auth.route"));
app.use("/api/v1/chat", require("./routes/chat.route"));
app.use("/api/v1/search", require("./routes/search.route"));
app.use("/api/v1/message", require("./routes/message.route"));

app.use((req, res, next) => {
  const error = new Error("Not found route");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500).send({
    message: error.message,
  });
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});
