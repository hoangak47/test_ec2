// Import mongoose
const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  token: {
    type: String,
  },
});

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      validate: {
        validator: function (v) {
          return /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email address`,
      },
      required: true,
      trim: true,
      unique: true,
    },
    // friends: [
    //   {
    //     info: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "User",
    //     },
    //     status: {
    //       type: String,
    //       enum: ["pending", "friend"],
    //       default: "pending",
    //     },
    //     nickname: {
    //       type: String,
    //       default: "",
    //     },
    //     _id: false,
    //   },
    // ],
    online: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    nickname: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  chatRoom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
  },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatRoomSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    image: { type: String, default: "" },
    isGroupChat: { type: Boolean, default: false },
    notification: { type: Number, default: 0 },
    lastMessage: { type: String, default: "" },
    userCreate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
  }
);

const NicknameSchema = new mongoose.Schema({
  id_room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatRoom",
    required: true,
  },
  id_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  nickname: {
    type: String,
    default: "",
  },
});

const FriendSchema = new mongoose.Schema({
  id_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  id_friend: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "friend"],
    default: "pending",
  },
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);
const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);
const Token = mongoose.model("Token", TokenSchema);
const Nickname = mongoose.model("Nickname", NicknameSchema);
const Friend = mongoose.model("Friend", FriendSchema);

module.exports = { User, Message, ChatRoom, Token, Nickname, Friend };
