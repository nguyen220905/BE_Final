# Hướng Dẫn Các Chức Năng Trong Dự Án (Backend)

Tài liệu này hướng dẫn chi tiết về cấu trúc, các file liên quan và các đoạn code cụ thể cho 4 chức năng chính của hệ thống backend:
1. **Đăng ký tài khoản & Mật khẩu (Register & Password)**
2. **Đăng nhập đơn giản & Xác thực (Simple Login & JWT)**
3. **Bình luận ảnh (Photo Comment)**
4. **Tải lên hình ảnh (Photo Uploading)**

---

### 1. Đăng ký tài khoản & Mật khẩu (Register & Password)

Chức năng này cho phép người dùng mới đăng ký tài khoản. Nó kiểm tra xem các thông tin bắt buộc có đầy đủ không (tên đăng nhập, mật khẩu, họ, tên), kiểm tra xem tên đăng nhập (`login_name`) đã tồn tại trong cơ sở dữ liệu hay chưa, và sau đó tạo mới bản ghi người dùng.

* **Các file liên quan:**
  * `db/userModel.js`: Định nghĩa Schema cho tài khoản người dùng (`Users`).
  * `routes/AuthRouter.js`: Xử lý request API đăng ký thông qua endpoint `POST /user`.

* **Đoạn code chi tiết:**

  * **Schema User (`db/userModel.js`):**
    ```javascript
    const mongoose = require("mongoose");

    const userSchema = new mongoose.Schema({
      first_name: { type: String, required: true },
      last_name: { type: String, required: true },
      location: { type: String },
      description: { type: String },
      occupation: { type: String },
      login_name: { type: String, required: true, unique: true },
      password: { type: String, required: true },
    });

    module.exports = mongoose.model.Users || mongoose.model("Users", userSchema);
    ```

  * **Route Đăng ký (`routes/AuthRouter.js`):**
    ```javascript
    router.post("/user", async (req, res) => {
      const {
        login_name,
        password,
        first_name,
        last_name,
        location,
        description,
        occupation,
      } = req.body;

      if (!login_name || !password || !first_name || !last_name) {
        return res
          .status(400)
          .send(
            "Thiếu thông tin bắt buộc (login_name, password, first_name, last_name)"
          );
      }

      try {
        const existingUser = await User.findOne({ login_name });
        if (existingUser) {
          return res.status(400).send("Tên đăng nhập đã tồn tại!");
        }

        const newUser = await User.create({
          login_name,
          password,
          first_name,
          last_name,
          location,
          description,
          occupation,
        });

        res.status(200).json({ _id: newUser._id, login_name: newUser.login_name });
      } catch (err) {
        res.status(400).send("Lỗi khi đăng ký: " + err.message);
      }
    });
    ```

---

### 2. Đăng nhập đơn giản & Xác thực (Simple Login)

Chức năng này xác thực thông tin đăng nhập của người dùng. Khi người dùng nhập đúng `login_name` và `password`, hệ thống sẽ ký và tạo ra một mã JWT (JSON Web Token). Token này sẽ được gửi về cho client và được lưu lại để đính kèm vào header `Authorization` trong các request tiếp theo. Hệ thống sử dụng một middleware (`authMiddleware`) để bảo vệ các route cần yêu cầu đăng nhập.

* **Các file liên quan:**
  * `routes/AuthRouter.js`: Xử lý API đăng nhập thông qua endpoint `POST /admin/login`.
  * `routes/Auth.js`: Middleware kiểm tra JWT từ header `Authorization`.
  * `index.js`: Đăng ký middleware xác thực cho các router tương ứng.

* **Đoạn code chi tiết:**

  * **Route Đăng nhập (`routes/AuthRouter.js`):**
    ```javascript
    router.post("/admin/login", async (req, res) => {
      const { login_name, password } = req.body;

      try {
        const user = await User.findOne({ login_name });

        if (!user || user.password !== password) {
          return res.status(400).send("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        // Tạo JWT Token có thời hạn 24 giờ
        const token = jwt.sign(
          { userId: user._id, login_name: user.login_name },
          JWT_SECRET,
          { expiresIn: "24h" }
        );

        res.status(200).json({
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name,
          token: token,
        });
      } catch (err) {
        res.status(400).send("Lỗi đăng nhập: " + err.message);
      }
    });
    ```

  * **Middleware Xác thực (`routes/Auth.js`):**
    ```javascript
    const jwt = require("jsonwebtoken");
    const JWT_SECRET = process.env.JWT_SECRET; 

    const authMiddleware = (req, res, next) => {
      const authHeader = req.headers["authorization"];
      
      if (!authHeader) {
        return res.status(401).send("Unauthorized: Không tìm thấy Token");
      }

      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Lưu thông tin giải mã vào req.user để sử dụng ở route tiếp theo
        next();
      } catch (err) {
        return res.status(401).send("Unauthorized: Token sai hoặc đã hết hạn");
      }
    };

    module.exports = authMiddleware;
    ```

  * **Đăng ký Middleware trong server (`index.js`):**
    ```javascript
    app.use("/api/user", authMiddleware, UserRouter);
    app.use("/api", authMiddleware, PhotoRouter);
    ```

---

### 3. Bình luận ảnh (News / Photo Comment)

Chức năng này cho phép người dùng đăng bình luận vào một bức ảnh cụ thể. Khi thực hiện request, hệ thống sẽ lấy `userId` của người dùng từ đối tượng `req.user` (đã được middleware xác thực thêm vào sau khi giải mã token). Sau đó, đối tượng bình luận sẽ được push vào mảng `comments` của bức ảnh đó trong Database.

* **Các file liên quan:**
  * `db/photoModel.js`: Định nghĩa Schema cho bình luận (`commentSchema`) nằm lồng trong Schema ảnh (`photoSchema`).
  * `routes/PhotoRouter.js`: Xử lý API thêm bình luận qua endpoint `POST /commentsOfPhoto/:photo_id`.

* **Đoạn code chi tiết:**

  * **Schema Photo & Comment (`db/photoModel.js`):**
    ```javascript
    const commentSchema = new mongoose.Schema({
      comment: String,
      date_time: { type: Date, default: Date.now },
      user_id: mongoose.Schema.Types.ObjectId,
    });

    const photoSchema = new mongoose.Schema({
      file_name: { type: String },
      date_time: { type: Date, default: Date.now },
      user_id: mongoose.Schema.Types.ObjectId,
      comments: [commentSchema],
    });
    ```

  * **Route Thêm bình luận (`routes/PhotoRouter.js`):**
    ```javascript
    router.post("/commentsOfPhoto/:photo_id", async (req, res) => {
      const photoId = req.params.photo_id;
      const { comment } = req.body;

      // Lấy ID user từ token đã qua middleware giải mã
      const userId = req.user.userId;

      if (!comment || comment.trim().length === 0) {
        return res.status(400).send("Bình luận không được để trống");
      }

      try {
        const photo = await Photo.findById(photoId);
        if (!photo) return res.status(404).send("Không tìm thấy ảnh");

        // Đẩy bình luận mới vào danh sách comment của ảnh
        photo.comments.push({
          comment: comment,
          date_time: new Date(),
          user_id: userId,
        });

        // Lưu thay đổi vào cơ sở dữ liệu
        await photo.save();
        res.status(200).send("Thêm bình luận thành công!");
      } catch (err) {
        res.status(500).send("Lỗi hệ thống khi thêm bình luận: " + err.message);
      }
    });
    ```

---

### 4. Tải lên hình ảnh (Photo Uploading)

Chức năng này cho phép người dùng đăng tải một file hình ảnh mới lên server. Hệ thống sử dụng thư viện `multer` để xử lý multipart form-data. File ảnh được lưu trữ cục bộ trong thư mục `./images` và được đặt tên duy nhất bằng cách kết hợp mốc thời gian hiện tại (`Date.now()`) với phần mở rộng của file. Đường dẫn ảnh được lưu trữ vào Database cùng với ID người đăng. Server cũng cấu hình một thư mục tĩnh (`static folder`) để client có thể truy cập trực tiếp file ảnh thông qua URL.

* **Các file liên quan:**
  * `routes/PhotoRouter.js`: Cấu hình Multer để lưu trữ ảnh và xử lý endpoint tải ảnh `POST /photos/new`.
  * `index.js`: Cấu hình static folder `/images` để phục vụ hiển thị ảnh.

* **Đoạn code chi tiết:**

  * **Cấu hình Multer & Route Upload ảnh (`routes/PhotoRouter.js`):**
    ```javascript
    const multer = require("multer");
    const path = require("path");
    const fs = require("fs");

    // Cấu hình lưu trữ ảnh trong thư mục cục bộ
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        const dir = "./images";
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
      },
      filename: function (req, file, cb) {
        // Tạo tên file độc nhất bằng timestamp
        cb(null, Date.now() + path.extname(file.originalname));
      },
    });
    const upload = multer({ storage: storage });

    // API Tải ảnh lên
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
    ```

  * **Cấu hình thư mục tĩnh phục vụ file ảnh (`index.js`):**
    ```javascript
    const path = require("path");

    // Cho phép client truy cập ảnh tĩnh tại URL http://localhost:8081/images/<tên_file>
    app.use("/images", express.static(path.join(__dirname, "images")));
    ```
