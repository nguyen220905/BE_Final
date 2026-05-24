require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const dbConnect = require("./db/dbConnect");
const UserRouter = require("./routes/UserRouter");
const PhotoRouter = require("./routes/PhotoRouter");
const authMiddleware = require("./routes/Auth");
const AuthRouter = require("./routes/AuthRouter");
const path = require("path");

// const CommentRouter = require("./routes/CommentRouter");

dbConnect();

app.use(cors());
app.use(express.json());
app.use("/api", AuthRouter);
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/api/user", authMiddleware, UserRouter);
app.use("/api", authMiddleware, PhotoRouter);

app.get("/", (request, response) => {
  response.send({ message: "Hello from photo-sharing app API!" });
});

app.listen(8081, () => {
  console.log("server listening on port 8081");
});
