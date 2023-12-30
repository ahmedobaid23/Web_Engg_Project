const express = require("express");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const Attacks = require("./models/Attacks");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const uploads = multer({ dest: "public/uploads/" });
const PORT = 4000;
const app = express();

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/")));

const salt = bcrypt.genSaltSync(10);
const secret = "lkdsjflksdjflskjshfhfa90123erwfsd";

mongoose
  .connect(
    "mongodb+srv://root:UhdyuIfauiGXTgPa@cluster0.pvcuanj.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(console.log("Connected"))
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  res.json("Test OK");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const verified = bcrypt.compareSync(password, userDoc.password);
  if (verified) {
    jwt.sign({ username, id: userDoc._id }, secret, {}, (error, token) => {
      if (error) throw error;
      res.cookie("token", token).json({
        id: userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("Wrong Credentials");
  }
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (error) {
    res.status(400).json(error);
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (error, info) => {
    if (error) throw error;
    res.json(info);
  });
});

app.post("/post", uploads.single("files"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (error, info) => {
    if (error) throw error;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      image: newPath,
      content,
      author: info.id,
    });
    res.json(postDoc);
  });
});

app.put("/post", uploads.single("files"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (error, info) => {
    if (error) throw error;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      res.status(400).json("You are not the Author of this post");
    }
    postDoc.title = title;
    postDoc.summary = summary;
    (postDoc.image = newPath ? newPath : postDoc.image),
      (postDoc.content = content);
    await postDoc.save();
    res.json(postDoc);
  });
});

app.get("/posts", async (req, res) => {
  const posts = await Post.find()
    .populate("author", ["username"])
    .sort({ createdAt: -1 });
  res.json(posts);
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.get("/cyberattacks", async (req, res) => {
  const attacks = await Attacks.find(
    {},
    {
      id: 1,
      title: 1,
      summary: 1,
      image: 1,
    }
  );
  res.json(attacks);
});

app.get("/cyberattacks/:id/quiz", async (req, res) => {
  const { id } = req.params;
  const attackDoc = await Attacks.findById(id, ["_id", "title", "mcqs"]);
  res.json(attackDoc);
});

app.post("/cyberattacks/:id/quiz/result", async (req, res) => {
  const { id } = req.params;
  const { mcqs } = await Attacks.findById(id, ["_id", "mcqs"]);
  const totalMcqs = mcqs.length;
  const correctMcqs = mcqs.filter((question, index) => {
    return question.correctAnswer === req.body[`answer_${index}`];
  }).length;
  const allCorrect = mcqs.every((question, index) => {
    return question.correctAnswer === req.body[`answer_${index}`];
  });
  res.redirect(
    `http://localhost:3000/cyber-attacks/${id}/quiz/result?total=${totalMcqs}&correct=${correctMcqs}&certified=${allCorrect}`
  );
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("Logged out");
});

app.post("/delete-post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id);
  await postDoc.deleteOne();
  res.json({ message: "Post deleted successfully" });
});

app.post("/delete-attack/:id", async (req, res) => {
  const { id } = req.params;
  const attackDoc = await Attacks.findById(id);
  await attackDoc.deleteOne();
  res.json({ message: "Attack deleted successfully" });
});

app.listen(PORT, () => {
  console.log(`Server listening at port ${PORT}`);
});
