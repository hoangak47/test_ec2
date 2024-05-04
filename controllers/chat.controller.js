const mongoose = require("mongoose");
const { ChatRoom, Message, Nickname } = require("../models/schema.model");

const chat = {
  createChatRoom: async (req, res) => {
    const { name, users, userCreate } = req.body;

    if (!name || !users) {
      return res.status(400).send({
        message: "Name and users are required",
      });
    }

    if (users.length > 2) {
      isGroupChat = true;
    }

    try {
      const chatRoom = await ChatRoom.create({
        name,
        users,
        userCreate,
      });

      return res.status(201).send({
        ...chatRoom._doc,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
  getChatRoom: async (req, res) => {
    const id = req.params.id;

    try {
      const chatRoom = await ChatRoom.findById(id).populate(
        "users",
        "-password -createdAt -updatedAt"
      );

      if (!chatRoom) {
        return res.status(404).send({
          message: "Chat room not found",
        });
      }

      for (let i = 0; i < chatRoom._doc.users.length; i++) {
        const user = chatRoom._doc.users[i];
        if (user._id.toString() !== id) {
          const nickname = await Nickname.findOne({
            id_user: user._id,
            id_room: chatRoom._id,
          });
          user.nickname = nickname ? nickname.nickname : user.username;
        }
      }

      return res.status(200).send({
        ...chatRoom._doc,
      });
    } catch (error) {
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
  getAllChatRoom: async (req, res) => {
    const id = req.headers["id"];

    try {
      let chatRooms = await ChatRoom.find({
        users: new mongoose.Types.ObjectId(id),
      })
        .populate("users", "-password -createdAt -updatedAt")
        .sort({ updatedAt: -1 });

      for (let i = 0; i < chatRooms.length; i++) {
        const chatRoom = chatRooms[i];
        if (!chatRoom.isGroupChat) {
          for (let j = 0; j < chatRoom.users.length; j++) {
            const user = chatRoom.users[j];
            if (user._id.toString() !== id) {
              const nickname = await Nickname.findOne({
                id_user: user._id,
                id_room: chatRoom._id,
              });
              user.nickname = nickname ? nickname.nickname : user.username; // Check if nickname exists
            }
          }
        }
      }

      return res.status(200).send([...chatRooms]);
    } catch (error) {
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },

  leaveChatRoom: async (req, res) => {
    const { id_room, id_user } = req.body;

    try {
      const chatRoom = await ChatRoom.findById(id_room);

      if (!chatRoom) {
        return res.status(404).send({
          message: "Chat room not found",
        });
      }

      const user = chatRoom.users.filter((user) => {
        return user.toString() !== id_user;
      });

      if (user.length === 1 && chatRoom.isGroupChat === false) {
        await ChatRoom.findByIdAndDelete(id_room);
        await Nickname.deleteMany({ id_room });
        await Message.deleteMany({ id_room });
      } else {
        await ChatRoom.findByIdAndUpdate(id_room, { users: user });
      }

      return res.status(200).send({
        message: "Leave chat room successfully",
      });
    } catch (error) {
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
};

module.exports = chat;
