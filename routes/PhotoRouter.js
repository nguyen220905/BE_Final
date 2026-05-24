const express = require("express");
const Photo = require("../db/photoModel");
const User = require("../db/userModel");
const router = express.Router();

// ==========================================
// CẤU HÌNH MULTER ĐỂ NHẬN FILE ẢNH (PROBLEM 3)
// ==========================================
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./images";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// ==========================================
// 1. LẤY DANH SÁCH ẢNH CỦA USER (Đã chuẩn)
// ==========================================
router.get("/photosOfUser/:id", async (request, response) => {
  const userId = request.params.id;

  try {
    const photos = await Photo.find({ user_id: userId });

    if (!photos || photos.length === 0) {
      return response.status(200).json([]);
    }

    const photosObj = JSON.parse(JSON.stringify(photos));

    await Promise.all(
      photosObj.map(async (photo) => {
        if (photo.comments && photo.comments.length > 0) {
          await Promise.all(
            photo.comments.map(async (comment) => {
              const user = await User.findById(
                comment.user_id,
                "_id first_name last_name"
              );
              comment.user = user;
              delete comment.user_id;
            })
          );
        }
      })
    );

    response.status(200).json(photosObj);
  } catch (err) {
    response
      .status(500)
      .json({ message: "Lỗi hệ thống khi truy vấn ảnh", error: err.message });
  }
});

// ==========================================
// 2. LẤY DANH SÁCH COMMENT CỦA USER (Đã chuẩn)
// ==========================================
router.get("/commentsOfUser/:id", async (req, res) => {
  const userId = req.params.id;
  try {
    const allPhotos = await Photo.find({});
    const userComments = [];

    allPhotos.forEach((photo) => {
      if (photo.comments) {
        photo.comments.forEach((comment) => {
          if (comment.user_id && comment.user_id.toString() === userId) {
            userComments.push({
              comment: comment.comment,
              date_time: comment.date_time,
              photo_file_name: photo.file_name,
              photo_id: photo._id,
            });
          }
        });
      }
    });

    res.status(200).json(userComments);
  } catch (err) {
    res
      .status(500)
      .send("Lỗi hệ thống khi lấy danh sách comment: " + err.message);
  }
});

// ==========================================
// 3. THÊM COMMENT VÀO ẢNH (PROBLEM 2 - Đã sửa lỗi)
// ==========================================
router.post("/commentsOfPhoto/:photo_id", async (req, res) => {
  const photoId = req.params.photo_id;
  const { comment } = req.body;

  // Lấy ID user từ token (middleware)
  const userId = req.user.userId;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).send("Bình luận không được để trống");
  }

  try {
    const photo = await Photo.findById(photoId);
    if (!photo) return res.status(404).send("Không tìm thấy ảnh");

    // Push comment mới vào mảng comments của ảnh
    photo.comments.push({
      comment: comment,
      date_time: new Date(),
      user_id: userId,
    });

    // Lệnh lưu vào Database chuẩn xác
    await photo.save();
    res.status(200).send("Thêm bình luận thành công!");
  } catch (err) {
    res.status(500).send("Lỗi hệ thống khi thêm bình luận: " + err.message);
  }
});

// ==========================================
// 4. UPLOAD ẢNH MỚI (PROBLEM 3)
// ==========================================
router.post("/photos/new", upload.single("uploadedphoto"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("Vui lòng chọn một file ảnh để tải lên");
  }

  const userId = req.user.userId;

  try {
    await Photo.create({
      file_name: req.file.filename,
      date_time: new Date(),
      user_id: userId,
      comments: [],
    });

    res.status(200).send("Upload ảnh thành công!");
  } catch (err) {
    res.status(500).send("Lỗi khi lưu ảnh vào Database: " + err.message);
  }
});

module.exports = router;
