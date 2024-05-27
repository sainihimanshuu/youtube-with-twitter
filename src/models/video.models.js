import mongoose from "mongoose"
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema=new mongoose.Schema(
    {
        videoFile: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            required: true,     
        },
        title: {
            type: String,
            required: true,     
        },
        description: {
            type: String,
            required: true,     
        },
        duration: {  
            type: Number,   //will also get from cloudinary
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)
// Plugins are a tool for reusing logic in multiple schemas.

export const Video=mongoose.model("Video", videoSchema)