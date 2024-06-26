import mongoose, { Schema, model } from "mongoose";
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            unique: true,
            trim: true,
        },
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],
        password: {
            type: String,
            required: [true, "Password required"],
        },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true }
);
// password hashing using bcryptjs
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const password = this.password;
    const salt = await bcryptjs.salt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);
    this.password = hashedPassword;
    next();
});
// password matching
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcryptjs.compare(password, this.password);
};
// generating access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};
// generating refresh token
userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

const User = model("User", userSchema);
export default User;
