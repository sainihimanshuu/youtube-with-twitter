import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js"
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const createPlaylist = asyncHandler( async (req, res) => {

    const { playlistName, playlistDesc } = req.body

    if(!playlistName)
        throw new ApiError(400, "Playlist name is required")

    const playlist = await Playlist.create({
        name: playlistName,
        description: playlistDesc || "",
        owner: req.user._id
    })  
    
    if (!playlist) {
        throw new ApiError(500, "failed to create playlist");
    }

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            playlist,
            "Playlist succesfully created"
        )
    )
    
})

const getPlayListById = asyncHandler( async (req, res) => {

    const { playlistId } = req.params

    console.log(playlistId)

    if(!playlistId)
        throw new ApiError(400, "No playlist id given")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist)
        throw new ApiError(400,"No playlist exist with this id")

    const playlistAgg = Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "vidoes",
                localField: "videos",
                foreignField: "_id",
                as:"videos",
                pipleine: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipleine: [
                                {
                                    $project: {
                                        avatar: 1,
                                        fullName: 1
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $addFields: {
                noOfvideos: {
                    $sum: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                totalViews: 1,
                noOfvideos: 1,
                createdAt: 1,
                videos: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    description: 1
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            { playlistAgg },
            "Playlist fetched succesfully"
        )
    )
})

const updatePlaylist = asyncHandler( async (req, res) => {

    const { playlistId } = req.params
    const { title, description } = req.body

    if(!playlistId)
        throw new ApiError(400, "No playlist id given")

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(title.trim()==="")
        throw new ApiError(400, "Title cannot be blank")

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can edit the playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {
            name: title,
            description: description
        },
        {new: true}
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "playlist updated successfully"
        )
    )    
})

const deletePlaylist = asyncHandler( async (req, res) => {

    const { playlistId } = req.params

    if(!playlistId)
        throw new ApiError(400, "No playlist id given")

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete the playlist");
    }

    const response = await Playlist.deleteOne({_id: playlistId})

    if(response.deletedCount!==1)
        throw new ApiError(400, "No playlist with the given id")

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {},
            "playlist deleted successfully"
        )
    )
})

const addVideoToPlaylist = asyncHandler( async(req, res) => {

    const { videoId, playlistId } = req.params

    if(!videoId)
        throw new ApiError(400, "no video id")

    if(!playlistId)
        throw new ApiError(400, "no playlist id")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "no video for the video id")

    const playlist = await Playlist.findById(playlistId)

    if(!playlist)
        throw new ApiError(400, "no such playlist exists")

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(400, "only owner can add video to thier playlist");
    }

    //const videoToAdd = await Video.findById(videoId)

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        { _id: playlistId },
        { $push: { videos: videoId } },
        { new: true }
    ) 

    if (!updatedPlaylist) {
        throw new ApiError(
            400,
            "failed to add video to playlist please try again"
        );
    }
    
    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video added succesfullly"
        )
    )
})

const removeVideoFromPlaylist = asyncHandler( async(req, res) => {
  
    const { videoId, playlistId } = req.params

    if(!videoId)
        throw new ApiError(400, "no video id")

    if(!playlistId)
        throw new ApiError(400, "no playlist id")

    const video = await Video.findById(videoId)

    if(!video)
        throw new ApiError(400, "no video for the video id")

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new ApiError(
            404,
            "only owner can remove video from thier playlist"
        )
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist)
        throw new ApiError(400, "no such playlist exists")

    const updatedPlaylist = Playlist.findByIdAndUpdate(
        {_id: playlistId},
        { $pull: { videos: videoId}},
        { new: true}
    )

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            updatedPlaylist,
            "Video deleted succesfullly"
        )
    )

})

const getUserPlaylist = asyncHandler( async(req, res) => {

    const { userId } = body.params

    if(!userId)
        throw new ApiError(400, "no userId given")

    const reqPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: userId
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            reqPlaylists,
            "Successfully Fetched User playlists"
        )
    )
})

export {
    createPlaylist,
    getPlayListById,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylist
}