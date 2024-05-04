// const Token = require("../models/token.model");

const { User, Token, ChatRoom, Friend } = require("../models/schema.model");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const regexPassword = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{6,}$/;

const auth = {
  generateAccessToken: (id) => {
    const token = jwt.sign(
      {
        id: id,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: 60 * 60,
      }
    );

    return token;
  },
  generateRefreshToken: (id) => {
    const token = jwt.sign(
      {
        id: id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: 7 * 24 * 60 * 60,
      }
    );

    return token;
  },
  login: async (req, res) => {
    const { password, email } = req.body;

    try {
      if (!password || !email) {
        return res.status(400).send({
          message: "Please provide a email and password",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).send({
          message: "User not found",
        });
      }

      if (user.online) {
        return res.status(400).send({
          message: "User is already online",
        });
      }

      const comparePassword = bcrypt.compareSync(password, user.password);
      if (!comparePassword) {
        return res.status(400).send({
          message: "Password is incorrect",
        });
      }

      user.password = undefined;

      const accessToken = auth.generateAccessToken(user._id);
      const refreshToken = auth.generateRefreshToken(user._id);

      await User.findOneAndUpdate(
        {
          _id: user._id,
        },
        {
          online: true,
        }
      );

      await Token.findOneAndUpdate(
        { _id: user._id },
        {
          token: refreshToken,
        }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return res.status(200).send({
        user,
        accessToken,
      });
    } catch (error) {
      console.log(error);
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
  register: async (req, res) => {
    const { username, password, email } = req.body;

    try {
      if (!username || !password || !email) {
        return res.status(400).send({
          message: "Please provide a username, email and password",
        });
      }

      if (!regexPassword.test(password)) {
        return res.status(400).send({
          message:
            "Password must contain at least 6 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character",
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        username,
        password: hashedPassword,
        email,
      });

      user.password = undefined;

      await ChatRoom.findByIdAndUpdate(
        "656f4dcc93fe02583f500e69",
        {
          $push: {
            users: user._id,
          },
        },
        { new: true }
      );

      await Token.create({
        _id: user._id,
        token: null,
      });

      return res.status(200).send({
        message: "User created successfully",
        user,
      });
    } catch (error) {
      if (error.code === 11000) {
        console.log(error);
        return res.status(400).send({
          message: "User already exists",
        });
      }

      if (error.name === "ValidationError") {
        let errors = {};

        Object.keys(error.errors).forEach((key) => {
          errors[key] = error.errors[key].message;
        });

        return res.status(400).send(errors);
      }

      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
  logout: async (req, res) => {
    try {
      const id = req.query.id;

      await Token.findOneAndUpdate(
        { _id: id },
        {
          token: null,
        }
      );

      res.clearCookie("refreshToken", {
        httpOnly: true,
        path: "/",
      });

      return res.status(200).send({
        message: "User logged out successfully",
      });
    } catch (error) {
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
  refreshToken: async (req, res) => {
    const id = req.query.id;

    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(403).send({
        message: "Refresh Token is required",
      });
    }

    const refreshTokenInDB = await Token.findOne({ _id: id });

    if (refreshToken !== refreshTokenInDB.token) {
      return res.status(403).send({
        message: "Refresh Token is not valid",
      });
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (error, decoded) => {
        if (error) {
          return res.status(403).send({
            message: "Refresh Token is not valid",
          });
        }

        const accessToken = auth.generateAccessToken(decoded.id);

        return res.status(200).send({
          message: "Token refreshed successfully",
          accessToken,
        });
      }
    );
  },
  getFriends: async (req, res) => {
    try {
      const id = req.query.id || req.headers["id"];

      const friends = await Friend.find({
        $or: [{ id_user: id }, { id_friend: id }],
      })
        .populate("id_user", "-password -createdAt -updatedAt")
        .populate("id_friend", "-password -createdAt -updatedAt");

      const friendsList = friends.map((friend) => {
        if (friend.id_user._id == id) {
          return {
            ...friend.id_friend._doc,
            status: friend.status,
            id_sender: friend.id_user._id,
            id_table: friend._id,
          };
        } else {
          return {
            ...friend.id_user._doc,
            status: friend.status,
            id_sender: friend.id_user._id,
            id_table: friend._id,
          };
        }
      });

      return res.status(200).send({
        friendsList,
      });
    } catch (error) {
      return res.status(500).send({
        message: "Something went wrong",
      });
    }
  },
};

module.exports = auth;
