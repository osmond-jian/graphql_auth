import mongoose from "mongoose";

export const User = mongoose.model("User", {
    email:String,
    username:String,
    password:String,
});