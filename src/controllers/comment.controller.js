import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.models.js"
import { Video } from "../models/video.models.js"

const addComment = asyncHandler( async (req, res) => {

    const { videoId } = req.params
    const { content } = req.body

    if(!videoId)
        throw new ApiError(400, "no video id")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "vidoe does not exist")

    const comment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user?._id
    })

    if(!comment)
        throw new ApiError(500, "failed to add comment, please try again")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            comment,
            "Comment added succesfully"
        )
    )
})

const deleteComment = asyncHandler( async (req, res) => {

    const { commentId } = req.params

    if(!commentId)
        throw new ApiError(400, "comment id not give")

    const comment = await Comment.findById(commentId)

    if(!comment)
        throw new ApiError(400 ,"comment does not exits")

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can edit their comment")
    }

    await Comment.findByIdandDelete(commentId)

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "Comment deleted successfully"
        )
    )
})

const updateComment = asyncHandler( async (req, res) => {

    const { commentId } = req.params
    const { newComment } = req.body

    if(!commentId)
        throw new ApiError(400, "comment id not give")

    const comment = await Comment.findById(commentId)

    if(!comment)
        throw new ApiError(400 ,"comment does not exits")

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only comment owner can edit their comment")
    }

    const updatedComment = await Comment.findByIdandUpdate(
        commentId,
        {
            content: newComment
        },
        {new: true}
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to edit comment please try again");
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedComment,
            "comment updated successfully"
        )
    )

})

const getVideoComments = asyncHandler( async (req, res) => {
    
    const { videoId } = req.params

    if(!videoId)
        throw new ApiError(400, "no video id")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "vidoe does not exist")

    const comments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            avatar: 1,
                            username: 1,
                            fullName: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
            $addFields: {
                noOfLikes: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {$in :[req.user._id, "likes.likedBy"]},
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
                owner: 1,
                createdAt: 1,
                content: 1,
                noOfLikes: 1,
                isLiked: 1
            }
        }
    ])


    return res.status(200)
    .json(
        new ApiResponse(
            200,
            comments,
            "Comments fetched successfully"
        )
    )

})
export {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
}