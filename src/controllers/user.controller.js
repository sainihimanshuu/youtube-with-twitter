import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import { uploadOnCloundinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async(userId) => {
    try{
        const user = await User.findOne(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //accessToken to ham user ko de dete h but refreshToken ham DB m store kara lete h
        await User.updateOne({ _id: user._id }, { $set: { refreshToken: refreshToken } })

        return {accessToken, refreshToken}
    }catch(err){
        throw new ApiError(500, "something went wrong while generating tokens")
    }
}

const registerUser = asyncHandler( async(req, res) => {

    // to register a user
    // 1.take username password, avatar(not necessary) email as input
    //1.1 validation
    //1.2 check if user already exits 
    //1.3 check for images, avatar
    //1.4 upload them on cloudinary
    //2. create user object- create entry in db
    //3. remove password and refresh token from response (bcoz jab bhi ham mongodb m entry krte h, wo automatically response m aa jaata h)
    //4. check for user creation 
    //5. return res

    // console.log(req.body)

    const { username, password, fullName, email } = req.body

    //for field to be non empty
    if(
        [username, password, fullName, email].some(
            (field) => field?.trim()===""
        )){
            throw new ApiError(400, "field is mandatory")
        }

    //for username to be lowercase
    if(!/^[a-z]+$/.test(username))
        throw new ApiError(400, "username should be in lowercase")

    //for correct email
    if(!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email))
        throw new ApiError(400, "invalid email")

    //to check if the entered email already has an account
    const emailExists=await User.findOne({email: email})
    if(emailExists)
        throw new ApiError(409, "email already has an account")
    
    //to check if the username already existe
    const usernameExists=await User.findOne({username: username})
    if(usernameExists)
        throw new ApiError(409, "username already exists, choose another one")

    //to upload avatar on cloudinary
    const avatarLocalPath=req.files?.avatar[0]?.path

    // console.log(`path in controller ${avatarLocalPath}`)

    if(!avatarLocalPath)
        throw new ApiError(400, "avatar file required")

    //await bcoz we want to wait untill the file gets uploaded
    const avatar=await uploadOnCloundinary(avatarLocalPath)

    if(!avatar)
        throw new ApiError(400, "avatar file required(cloudinary)")
    
    //to upload coverImage on cloudinary 
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    const coverImage=await uploadOnCloundinary(coverImageLocalPath)

    const user=await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password
    })

    //to confirm that the user has been created
    //in select we write kya kya nahi chahiye
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //DOUBT why remove password and refreshtoken?
    //bcoz on using .create, we recieve password and refreshToken also, and we do not want to pass them as response

    if(!createdUser)
        throw new ApiError(500, "something went wrong while registering the user")

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

    //DOUBT: why use both res.status and ApiResponse?
})

const loginUser = asyncHandler( async(req, res) => {

    //get the username, password or email, password from req body
    //check if the user is registered or not
    //check if the password is correct for the corresponding username or email
    //if correct, generate access and refresh tokens
    //send cookies
    //login the user

    const {username, email, password} = req.body

    if(!(username || email))
        throw new ApiError(400, "any one of username or email is required")

    const user = await User.findOne({$or : [{email: email}, {username: username}]})

    if(!user)
        throw new ApiError(404, "User not found, register first")

    const isPasswordValid = await user.isPasswordCorrect(password, user)

    if(!isPasswordValid)
        throw new ApiError(401, "password incorrect")

    //access token and refresh tokens are generated quite frequently, so it is better to define a function to generate them
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    //Cookies are small pieces of text sent to your browser by a website you visit.

    //why did we not directly use the user object? bcoz at the time of its creation, refresh token field was empty
    const loggedInUser = await User.findById(user._id).select("-refreshToken -password")

    //we need to set options(nothing but an object) for cookies, 
    const options={
        httpOnly: true, //Flags the cookie to be accessible only by the web server.
        secure: true //Marks the cookie to be used with HTTPS only.
    }
    //by setting both of them true, the cookie then can be modified only from server and not from frontend

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
    )
})

const logOutUser = asyncHandler( async(req, res) => {
    await User.findByIdAndUpdate(req.user._id,
        {
            refreshToken: ""
        }
    )

    const options={
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            {},
            "user logged out"
        )
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {

    //how to deal if the no cookies? like do we use authoriazation header or req.body? not confirmed so I used both 
    const oldRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!oldRefreshToken)
        new ApiError(401, "unauthorized access")

    const decodedToken = jwt.verify(oldRefreshToken, process.env.REFRESH_TOKEN_SECRET)    

    const user = await User.findById(decodedToken?._id)

    if(!user)
        throw new ApiError(401, "Invalid refresh token")

    if(oldRefreshToken!==user.refreshToken)
        throw new ApiError(401, "Refresh token is expired or used")

    const {newAccessToken, newRefreshToken} = await generateAccessAndRefreshTokens(decodedToken._id)

    const options={
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("refreshToken", newRefreshToken, options)
    .cookie("accessToken", newAccessToken, options)
    .json(
        new ApiResponse(
            200,
            {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken
            },
            "Access Token refreshed"
        )
    )
})

const changeCurrentPassword = asyncHandler( async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect)
        throw new ApiError(400, "invalid old password")

    await User.updateOne({ _id: user._id }, { $set: { password: newPassword } })

    // user.password = newPassword
    // await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "password changed succesfully"
        )
    )
})

const getCurrentUser = asyncHandler( async (req, res) => {

    const currentUser = await User.findById(req.user._id)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                currentUser: currentUser
            },
            "User fetched successfully"
        )
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {

    const { fullName, email } = req.body    

    if(!fullName || !email)
        throw new ApiError(400, "All fields are required")

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            fullName: fullName,
            email: email
        },
        {new: true}
    ).select("-password -refreshToken")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                user: user
            },
            "Details updated successfully"
        )
    )

})

const updateUserAvatar = asyncHandler( async (req, res) => {

    const localFilePath = req.file?.path

    if(!localFilePath)
        throw new ApiError(400, "new Avatar file missing")

    const response = await uploadOnCloundinary(localFilePath)

    const newAvatar = response.url

    if(!newAvatar)
        throw new ApiError(400, "Error while uploading new avatar on cloudinary")

    const user = await User.findByIdAndUpdate(
        req.user_id,
        {
            avatar: newAvatar
        },
        {new: true}
    ).select("-refreshToken -password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                user: user
            },
            "Avatar updated successfully"
        )
    )
})

const updateUserCoverImage = asyncHandler( async (req, res) => {

    const localFilePath = req.file?.path

    if(!localFilePath)
        throw new ApiError(400, "new Cover image file missing")

    const response = await uploadOnCloundinary(localFilePath)

    const newCoverImage = response.url

    if(!newAvatar)
        throw new ApiError(400, "Error while uploading new coverImage on cloudinary")

    const user = await User.findByIdAndUpdate(
        req.user_id,
        {
            coverImage: newCoverImage
        },
        {new: true}
    ).select("-refreshToken -password")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {
                user: user
            },
            "Cover image updated successfully"
        )
    )
})

const getUserChannelProfile = asyncHandler( async(req, res) => {

    const { username } = req.params

    //console.log(username)

    if(!username)
        throw new ApiError(400, "No username given")

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscriberCount: {
                        $size: "$subscriber"
                    },
                    channelsSubscribedToCount: {
                        $isze: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    coverImage: 1,
                    avatar: 1,
                    fullName: 1,
                    username: 1,
                    subscriberCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1
                }
            }
        ]
    )

    //console.log(channel)

    if(!channel.length)
        throw new ApiError(404, "channel does not exist")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            channel[0],
            "User channel fetched successfully"
        )
    )
})

const getWatchHistory = asyncHandler( async(req, res) => {

    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "watchHistory fetched successfully"
        )
    )
})

//todo - delete old avatar and coverImage
export { registerUser,
         loginUser,
         logOutUser,
         refreshAccessToken,
         changeCurrentPassword,
         getCurrentUser,
         updateAccountDetails,
         updateUserAvatar,
         updateUserCoverImage,
         getUserChannelProfile,
         getWatchHistory
}