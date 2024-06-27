import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // accepts data from user
    const { username, fullname, email, password } = req.body;

    // validation check
    if (
        [username, fullname, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check user already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    // handle images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // validation for avatarLocalPath
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file required");
    }
    // upload files to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // validation for avatar
    if (!avatar) {
        throw new ApiError(500, "Avatar upload failed");
    }

    // create user object
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });
    // check for created user
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // if no createdUser
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }
    // final response
    res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

export { registerUser };
