import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while creating refresh and access tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // accepts data from user
    const { username, fullname, email, password } = req.body;

    // validation check
    if (
        [username, fullname, email, password].some(
            (field) =>
                field === undefined || field === null || field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check user already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existedUser) {
        // fs.unlinkSync(req.files?.avatar[0]?.path)
        // fs.unlinkSync(req.files?.coverImage[0]?.path)
        throw new ApiError(409, "User already exists");
    }

    // handle images
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }
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

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    // do validation check for email
    if (!username && !email) {
        throw new ApiError(400, "username or email required");
    }
    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) {
        throw new ApiError(404, "User does not exists");
    }
    // methods where from mongodb response instance
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid password");

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
    res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decodedToken = await jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Unauthorized request");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired or used");
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);
        console.log(refreshToken);
        const options = {
            httpOnly: true,
            secure: true,
        };
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Inavalid refresh token");
    }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
