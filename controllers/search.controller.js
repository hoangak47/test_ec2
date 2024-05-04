const { User, Friend } = require("../models/schema.model");

const search = {
  search: async (req, res) => {
    const { search } = req.query;
    const { id } = req.headers;

    let users = null;

    if (!search) {
      return res.status(400).send({
        message: "Search is required",
      });
    }

    if (search.includes("@")) {
      users = await User.find({
        email: { $regex: search, $options: "i" },
        _id: { $ne: id },
      }).select("_id username email image online");
    } else {
      users = await User.find({
        username: { $regex: search, $options: "i" },
        _id: { $ne: id },
      }).select("_id username email image online");
    }

    const friend = await Friend.find({
      $or: [{ id_user: id }, { id_friend: id }],
    }).select("id_user id_friend status");

    const listFriend = users.map((user) => {
      const friendExist = friend.find(
        (item) =>
          item.id_friend.toString() === user._id.toString() ||
          item.id_user.toString() === user._id.toString()
      );

      if (friendExist) {
        return {
          ...user._doc,
          status: friendExist.status || 0,
          id_sender: friendExist.id_user,
          id_table: friendExist._id,
        };
      }

      return user;
    });

    res.status(200).send(listFriend);
  },
};

module.exports = search;
