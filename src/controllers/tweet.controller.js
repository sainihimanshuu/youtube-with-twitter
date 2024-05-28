import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Tweet } from "../models/tweet.models.js"
import { User } from "../models/user.models.js"
import mongoose, { isValidObjectId } from "mongoose"

const createTweet = asyncHandler( async (req, res) => {

    const { content } = req.body

    if(!content)
        throw new ApiError(400, "tweet cannot be empty")

    const tweet = await Tweet.create({
        owner: req.user?._id,
        content: content
    })

    if(!tweet)
        throw new ApiError(500, "could not create tweet, please try again")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            tweet,
            "Tweet created successfully"
        )
    )
})

const deleteTweet = asyncHandler( async (req, res) => {

    const { tweetId } = req.params

    if(!isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid tweet id")

    const tweet = await Tweet.findById(tweetId)

    if(!tweet)
        throw new ApiError(400, "tweet does not exist")

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete thier tweet");
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Tweet deleted successfully"
        )
    )
})

const updateTweet = asyncHandler( async (req, res) => {

    const { tweetId } = req.params
    const { content } = req.body

    if(!isValidObjectId(tweetId))
        throw new ApiError(400, "Invalid tweet id")

    if(content.trim() === "")
        throw new ApiError(400, "tweet cannot be empty")

    const tweet = await Tweet.findById(tweetId)

    if(!tweet)
        throw new ApiError(400, "tweet does not exist")

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can update thier tweet");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            content: content
        },
        { new: true }
    )

    if(!updatedTweet)
        throw new ApiError(500, "could not update tweet, please try again")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedTweet,
            "Tweet updated successfully"
        )
    )
})

const getUserTweets = asyncHandler( async (req, res) => {
    
    const { userId } = req.params

    if(!isValidObjectId(userId))
        throw new ApiError(400, "invalid userId")

    const user = await User.findById(userId)

    if(!user)
        throw new ApiError(400, "no such user exists")

    const userTweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "tweetOwner"
            }
        },
        {
            $unwind: "$tweetOwner"
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeOnTweet",
            }
        },
        {
            $addFields: {
                noOfLikes: {
                    $size: "$likeOnTweet"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?.in, "$likeOnTweet.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                _id: 0,
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                tweetOwner: {
                    fullName: 1,
                    avatar: 1
                },
                noOfLikes: 1,
                isLiked: 1
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            { userTweets },
            "User tweets fetched successfully"
        )
    )
})

export {
    createTweet,
    deleteTweet,
    updateTweet,
    getUserTweets
}