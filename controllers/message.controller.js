const { ChatRoom, Message } = require("../models/schema.model");

const message = {
  sendMessage: async (req, res) => {
    const id_room = req.params.id;
    const { sender, message } = req.body;

    try {
      const chatRoom = await ChatRoom.findById(id_room);

      if (!chatRoom) {
        return res.status(404).send({
          message: "Chat room not found",
        });
      }

      await Message.create({
        sender,
        chatRoom: id_room,
        message,
      });

      return res.status(201).send({
        message: "Message sent successfully",
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        message: "Send message failed",
      });
    }
  },
  getMessages: async (req, res) => {
    const id_room = req.params.id;
    const page = req.params.page || 1;
    const limit = 20;

    try {
      const messages = await Message.find({ chatRoom: id_room })
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "username");

      if (!messages) {
        return res.status(404).send({
          message: "Messages not found",
        });
      }

      return res.status(200).send([...messages]);
    } catch (error) {
      return res.status(500).send({
        message: "Get messages failed",
      });
    }
  },
};

module.exports = message;
