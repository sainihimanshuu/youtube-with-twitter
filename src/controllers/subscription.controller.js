import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { User } from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import mongoose, { isValidObjectId } from "mongoose"

const toggleSubscription = asyncHandler( async (req, res) => {
    
    const { channelId } = req.params

    if(!isValidObjectId(channelId))
        throw new ApiError(400, "not valid channel id")

    const channel = User.findById(channelId)

    if(!channel)
        throw new ApiError(400, "no such channel exists")

    const isSubscribed = Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id)

        return res.status(200)
        .json(
            new ApiResponse(
                200,
                {isSubscribed: false},
                "Channel unsubscribed successfully"
            )
        )
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId        
    })

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {isSubscribed: true},
            "Channel subscribed successfully"
        )
    )
})

//return channels to which the given channel is subscribed
const getSubscribedChannels = asyncHandler( async (req, res) => {

    const { channelId } = req.params

    if(!isValidObjectId(channelId))
        throw new ApiError(400, "not valid channel id")

    const channel = User.findById(channelId)

    if(!channel)
        throw new ApiError(400, "no such channel exists")

    const subscribedChannel = Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedTo",
            }
        },
        {
            $unwind: "$subscribedTo"
        },
        {
            $project: {
                subscribedTo: {
                    fullName: 1,
                    avatar: 1
                }
            }
        }
    ])

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            subscribedChannel,
            "Subscribed channels fetched successfully"
        )
    )
})

//return channels which have subscribed to the user
const getUserChannelSubscribers = asyncHandler( async (req, res) => {

    const { userId } = req.params

    if(!isValidObjectId(userId))
        throw new ApiError(400, "not valid userId")

    const mySubscribers = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "mySubscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscription",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscriberToMySubscriber"
                        }
                    },
                    {
                        $addFields: {
                            isSubscribedToMySubscriber: {
                                $cond: {
                                    if: {$in: [userId, "$subscriberToMySubscriber.subscriber"]},
                                    then: true,
                                    else: false
                                }
                            },
                            noOfSubsOfMySubscriber: {
                                $size: "$subscriberToMySubscriber"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$mySubscribers"
        },
        {
            $project: {
                _id: 0,
                mySubscribers: {  //try by not unwinding and accessing using mySubscribers[0]
                    fullName: 1,
                    avatar: 1,
                    isSubscribedToMySubscriber: 1,
                    noOfSubsOfMySubscriber: 1
                }
            }
        }
    ]) 

    return res.status(200)
    .json(
        new ApiResponse(
            200,
            {mySubscribers},
            "Successfully Fetched User Channel Subscribers"
        )
    )
})

export {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers
}