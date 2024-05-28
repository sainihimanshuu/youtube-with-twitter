import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import { uploadOnCloundinary, 
        deleteFromCloundinary } from "../utils/cloudinary.js"
import { Video } from "../models/video.models.js"
import { Like } from "../models/like.models.js"
import { User } from "../models/like.models.js"
import { Comment } from "../models/comment.models.js"

const togglePublishStatus = asyncHandler( async (req, res) => {
    
    const { videoId } = req.params

    if(!isValidObjectId(videoId))
        throw new ApiError(400, "invalid videoId")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "No such video exists")

    if(video?.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "only the user can toggle publish status")

    const publishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            isPublished: !video?.isPublished
        },
        { new: true }
    )

    if(!publishStatus)
        throw new ApiError(500, "Failed to toggle publish status, please try again")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            { publishStatus: publishStatus.isPublished},
            "Publish status toggled successfully"
        )
    )
})

const updateVideo = asyncHandler( async (req, res) => {

    const { videoId } = req.params
    const { thumbnail } = req.file?.path
    const { title, description } = req.body

    if(!isValidObjectId(videoId))
        throw new ApiError(400, "invalid videoId")

    if(!title || !description)
        throw new ApiError(400, "title is required")

    if(!description)
        throw new ApiError(400, "description is required")

    if(!thumbnail)
        throw new ApiError(400, "Thumbnail is required")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "no such video exists")

    if(video.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "only the owner can update the video")

    const newThumbnail = await uploadOnCloundinary(thumbnail)

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            thumbnail: newThumbnail,
            title: title,
            description: description
        },
        { new: true }
    )

    if(!updatedVideo)
        throw new ApiError(500, "Failed to update video, please try again")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            { updatedVideo },
            "Video updated successfully"
        )
    )
})

const deleteVideo = asyncHandler( async (req, res) => {

    const { videoId } = req.params

    if(!isValidObjectId(videoId))
        throw new ApiError(400, "invalid videoId")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "No such video exists")

    if(video?.owner.toString() !== req.user?._id.toString())
        throw new ApiError(400, "only the user can delete the video")

    const deleltedVideo = await Video.findByIdAndDelete(videoId)

    if(!deleltedVideo)
        throw new ApiError("Video deletion failed, please try again")

    await Like.deleteMany({
        video: videoId
    })

    await Comment.deleteMany({
        video: videoId
    })

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Video deleted successfully"
        )
    )
})

const getVideoById = asyncHandler( async (req, res) => {

    const { videoId } = req.params

    if(!isValidObjectId(videoId))
        throw new ApiError(400, "invalid videoId")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "no such video exists")

    const videoFile = Video.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersToUploader"
                        }
                    },
                    {
                        $addFields: {
                            noOfsubsToChannel: {
                                $size: "$subscribersToUploader"
                            },
                            isChannelSubscribed: {
                                $cond: {
                                    if : {$in: [req.user?._id, "$subscribersToUploader.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "commentDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "commentOwnerDetails"
                        }
                    },
                    {
                        $unwind: "$commentOwnerDetails"
                    },
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "commentLikes"
                        }
                    },
                    {
                        $addFields: {
                            noOfLikesonComment: {
                                $size: "$commentLikes"
                            },
                            isCommentLiked: {
                                $cond: {
                                    if: {$in: [req.user?._id, "$commentLikes.likedBy"]},
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $unwind: "$commentDetails"
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "videoLikes"
            }
        },
        {
            $addFields: {
                noOfLikesOnVideo: {
                    $size: "$videoLikes"
                },
                isVideoLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$videoLikes.likedBy"]}
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                videoFile: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1, 
                updatedAt: 1,
                ownerDetails: {
                    avatar: 1,
                    fullName: 1,
                    noOfsubsToChannel: 1,
                    isChannelSubscribed: 1
                },
                commentDetails: {
                    content: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    commentOwnerDetails: {
                        fullName: 1,
                        avatar: 1
                    },
                    noOfLikesonComment: 1,
                    isCommentLiked: 1
                },
                noOfLikesOnVideo: 1,
                isVideoLiked: 1
            }
        }
    ])

    if(!videoFile)
        throw new ApiError(500, "Video fetch failed, please try again")

    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1
            }
        }
    )

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $addToSet: {    //addToSet does not insert value if already present inside array, whereas push inserts anyway
                watchHistory: videoId
            }
        }
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            videoFile,
            "Video fetched successfully"
        )
    )
})

const getAllVideos = asyncHandler( async (req, res) => {

    const { query, sortBy, sortType, userId} = req.query

    const pipeline = []

    if(query){
        pipeline.push(
            {
                $search: {  //search should always be the first pipeline
                    index: "searchVideos",
                    text: {
                        query: query,
                        path: ["title", "description"]
                    }
                }
            }
        )
    }

    if(userId){
        if(!isValidObjectId(userId))
            throw new ApiError(400, "invalid userId")

        pipeline.push(
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            }
        )
    }

    if(sortBy && sortType){
        pipeline.push(
            {
                $sort: {
                    [sortBy]: sortType === "asc" ? 1 : -1
                }
            }
        )
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videos = Video.aggregate(pipeline)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "videos fetched successfully"
        )
    )
})
 

export {
    togglePublishStatus,
    updateVideo,
    deleteVideo,
    getVideoById,
    getAllVideos
}