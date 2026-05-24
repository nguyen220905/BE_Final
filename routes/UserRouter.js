const express = require("express");
const User = require("../db/userModel");
const Photo = require("../db/photoModel");
const router = express.Router();

router.get("/list", async (req, res) => {
  try {
    const users = await User.find({}, "_id first_name last_name");

    const allPhotos = await Photo.find({});

    const userListWithCounts = await Promise.all(
      users.map(async (user) => {
        const photoCount = await Photo.countDocuments({ user_id: user._id });

        let commentCount = 0;
        allPhotos.forEach((photo) => {
          if (photo.comments) {
            photo.comments.forEach((comment) => {
              if (
                comment.user_id &&
                comment.user_id.toString() === user._id.toString()
              ) {
                commentCount++;
              }
            });
          }
        });

        return {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          photoCount: photoCount,
          commentCount: commentCount,
        };
      })
    );

    res.json(userListWithCounts);
  } catch (err) {
    res.status(500).send("Lỗi server khi lấy danh sách user: " + err.message);
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findById(
      id,
      "_id first_name last_name location description occupation"
    );
    if (!user) {
      return res.status(404).send("Không tìm thấy user tương ứng");
    }
    res.json(user);
  } catch (err) {
    res.status(500).send("Lỗi server khi tìm chi tiết user");
  }
});

router.post("/", async (request, response) => {
  // Logic xử lý tạo/đăng ký user viết ở đây
});

module.exports = router;
