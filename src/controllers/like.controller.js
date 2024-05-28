import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.models.js"
import { Like } from "../models/like.models.js"
import { Tweet } from "../models/tweet.models.js"
import { Comment } from "../models/comment.models.js"

const toggleVideoLike = asyncHandler( async(req, res) => {

    const { videoId } = body.params

    if(!videoId)
        throw new ApiError(400, "no video id")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "no video exists")

    const isLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)

        return res.status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked: false},
                "Unliked videos succesfully"
            )
        )
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked: true},
            "Liked videos succesfully"
        )
    )
})

const toggleCommentLike = asyncHandler( async(req, res) => {

    const { commentId } = body.params

    if(!commentId)
        throw new ApiError(400, "no comment Id")

    const comment = await Comment.findById(commentId)

    if(!comment)
        throw new ApiError(400, "no comment exists")

    const isLiked = Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)

        return res.status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked: false},
                "Unliked comment succesfully"
            )
        )
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked: true},
            "Liked comment succesfully"
        )
    )
})

const toggleTweetLike = asyncHandler( async(req, res) => {

    const { tweetId } = body.params

    if(!tweetId)
        throw new ApiError(400, "no tweet Id")

    const tweet = await Tweet.findById(tweetId)

    if(!tweet)
        throw new ApiError(400, "no tweet exists")

    const isLiked = Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(isLiked){
        await Like.findByIdAndDelete(isLiked?._id)

        return res.status(200)
        .json(
            new ApiResponse(
                200,
                {isLiked: false},
                "Unliked tweet succesfully"
            )
        )
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {isLiked: true},
            "Liked tweet succesfully"
        )
    )
})

const getLikedVideos = asyncHandler( async (req, res) => {

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        {
            $unwind: "$video"
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                video: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        username: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked videos fetched successfully"
        )
    )
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}