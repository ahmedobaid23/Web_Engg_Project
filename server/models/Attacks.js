const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AttacksSchema = new Schema({
  title: String,
  summary: String,
  image: String,
  mcqs: Array,
});

const AttacksModel = mongoose.model("Attacks", AttacksSchema);

module.exports = AttacksModel;
