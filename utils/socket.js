const auth = require("../controllers/auth.controller");
const {
  User,
  Message,
  ChatRoom,
  Token,
  Nickname,
  Friend,
} = require("../models/schema.model");
const jwt = require("jsonwebtoken");

const userOnline = [];

function SocketIo(socketIo) {
  socketIo.on("connection", (socket) => {
    if (socket && socket.handshake.query?.id !== "undefined") {
      const index = userOnline.findIndex(
        (user) => user?.userId === socket.handshake.query.id
      );

      if (index === -1) {
        userOnline.push({
          socketId: socket.id,
          userId: socket.handshake.query.id,
        });
      } else {
        userOnline[index].socketId = socket.id;
      }
    }
    socket.use((packet, next) => {
      const { id, accessToken } = packet[1];
      if (accessToken) {
        jwt.verify(
          accessToken,
          process.env.ACCESS_TOKEN_SECRET,
          async (err, decoded) => {
            if (err) {
              if (err.name === "TokenExpiredError") {
                const refreshToken = socket.handshake.headers.cookie
                  ?.split("refreshToken=")[1]
                  ?.split(";")[0];

                if (!refreshToken) {
                  socket.emit("error", { message: "Unauthorized", id });
                  return next(new Error("Unauthorized"));
                }

                jwt.verify(
                  refreshToken,
                  process.env.REFRESH_TOKEN_SECRET,
                  async (err, decoded) => {
                    if (err) {
                      socket.emit("error", { message: "Unauthorized", id });
                      return next(new Error("Unauthorized"));
                    }

                    const newAccessToken = auth.generateAccessToken(decoded.id);

                    socket.emit("new-access-token", {
                      accessToken: newAccessToken,
                      id,
                    });

                    next();
                  }
                );
              }

              socket.emit("error", { message: "Unauthorized", id });
              return next(new Error("Unauthorized"));
            }

            if (id !== decoded.id) {
              socket.emit("error", { message: "Access token not valid", id });
            }

            next();
          }
        );
      }
    });

    socket.on("change-profile", async (data) => {
      const { phone, address, id } = data;

      try {
        const user = await User.findByIdAndUpdate(
          id,
          { phone, address },
          { new: true }
        );

        socketIo.emit("receive-change-profile", user);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("send-message", async (data) => {
      const { message, id, id_room } = data;

      try {
        const chatRoom = await ChatRoom.findById(id_room);

        if (!chatRoom) {
          return;
        }

        const sendMessage = await Message.create({
          sender: id,
          chatRoom: id_room,
          message,
        });

        await ChatRoom.findByIdAndUpdate(id_room, {
          updatedAt: new Date(),
        });

        const newMessage = await Message.findById(sendMessage._id).populate(
          "sender",
          "username"
        );

        socketIo.emit("room-update", id_room);
        socketIo.emit("receive-message", newMessage);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("edit-room", async (data) => {
      const { id_room, name, image } = data;
      try {
        if (!id_room) {
          return;
        }

        if (!name && !image) {
          return;
        }

        if (!name) {
          await ChatRoom.findByIdAndUpdate(id_room, { image }, { new: true });
        } else if (!image) {
          await await ChatRoom.findByIdAndUpdate(
            id_room,
            { name, updatedAt: new Date() },
            { new: true }
          );
        } else {
          await ChatRoom.findByIdAndUpdate(
            id_room,
            { name, image, updatedAt: new Date() },
            { new: true }
          );
        }

        const chatRoom = await ChatRoom.findById(id_room).populate(
          "users",
          "-password -createdAt -updatedAt"
        );

        socketIo.emit("receive-edit-room", chatRoom);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("add-room", async (data) => {
      const { name, users, image, userCreate, isGroupChat } = data;
      try {
        if (!isGroupChat) {
          const checkRoom = await ChatRoom.findOne({
            users: { $all: Object.values(users) },
            isGroupChat: false,
          });

          if (checkRoom) {
            socketIo.emit("receive-room-exist", checkRoom);
          } else {
            const chatRoom = await ChatRoom.create({
              name: name ? name : "",
              users,
              image: image ? image : null,
              userCreate,
              isGroupChat: isGroupChat ? isGroupChat : false,
            });

            const chatRoomPopulate = await ChatRoom.findById(
              chatRoom._id
            ).populate("users", "-password -createdAt -updatedAt");

            socketIo.emit("receive-add-room", chatRoomPopulate);
          }

          return;
        }

        const chatRoom = await ChatRoom.create({
          name: name ? name : "",
          users,
          image: image ? image : null,
          userCreate,
          isGroupChat: isGroupChat ? isGroupChat : false,
        });

        const chatRoomPopulate = await ChatRoom.findById(chatRoom._id).populate(
          "users",
          "-password -createdAt -updatedAt"
        );

        socketIo.emit("receive-add-room", chatRoomPopulate);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("leave-room", async (data) => {
      const { id_room, id_user } = data;

      try {
        const chatRoom = await ChatRoom.findById(id_room);

        if (!chatRoom) {
          return;
        }

        const user = chatRoom.users.filter((user) => user != id_user);

        if (user.length === 1 && !chatRoom.isGroupChat) {
          await ChatRoom.findByIdAndDelete(id_room);
          socketIo.emit("receive-leave-room", id_room);
        } else {
          await ChatRoom.findByIdAndUpdate(
            id_room,
            { users: user },
            { new: true }
          );

          const update_member = await ChatRoom.findById(id_room).populate(
            "users",
            "-password -createdAt -updatedAt"
          );

          socketIo.emit("receive-update-member", {
            id_room,
            update_member: update_member.users,
            id_user,
          });
        }
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("add-friend", async (data) => {
      const { id_user, id_friend } = data;

      try {
        const checkFriend = await Friend.findOne({
          $or: [
            { id_user: id_user, id_friend: id_friend },
            { id_user: id_friend, id_friend: id_user },
          ],
        });

        if (checkFriend) {
          return;
        }

        const friend = await Friend.create({
          id_user,
          id_friend,
        });

        const friendPopulate = await Friend.findById(friend._id)
          .populate("id_user", "-password -createdAt -updatedAt")
          .populate("id_friend", "-password -createdAt -updatedAt");

        socketIo.emit("receive-add-friend", {
          friendPopulate,
          id_user,
          id_friend,
        });
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("accept-friend", async (data) => {
      const { id_table } = data;
      try {
        const friend = await Friend.findByIdAndUpdate(
          id_table,
          { status: "friend" },
          { new: true }
        );

        socketIo.emit("receive-accept-friend", friend);
      } catch (error) {}
    });

    socket.on("decline-friend", async (data) => {
      const { id_table } = data;

      try {
        await Friend.findByIdAndDelete(id_table);
        socketIo.emit("receive-decline-friend", id_table);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("set-nickname", async (data) => {
      const { id_room, id_user, nickname } = data;

      try {
        const checkNickname = await Nickname.findOne({
          id_room,
          id_user,
        });

        if (checkNickname) {
          await Nickname.findByIdAndUpdate(
            checkNickname._id,
            { nickname },
            { new: true }
          );
        } else {
          await Nickname.create({
            id_room,
            id_user,
            nickname,
          });
        }

        socketIo.emit("receive-set-nickname", data);
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("disconnect", async () => {
      const index = userOnline.findIndex((user) => user.socketId === socket.id);
      await User.findByIdAndUpdate(
        userOnline[index]?.userId,
        { online: false },
        { new: true }
      );
      // await Token.findByIdAndUpdate(
      //   userOnline[index]?.userId,
      //   { token: "" },
      //   { new: true }
      // );
      if (index !== -1) {
        userOnline.splice(index, 1);
      }
    });
  });
}

module.exports = SocketIo;
