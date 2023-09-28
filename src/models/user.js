import Mongoose from "mongoose";

export const User = Mongoose.model("User", {
    email:String,
    username:String,
    password:String,
});