//to improve - password is getting stored in its raw form
//delete old avtara and coverimage while updating them, also while updating video
//handle the condition if thumbnail is not provided while updating video
//delete video and thumbnail from cloudinary upon deletion of video
//implement pagination for comments and videos page

import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"  //to access cookies and modify them

const app=express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

//add the built-in JSON body parser to properly add the "body" property to the request object. app.use(express.json())
app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"})) //extended allows objects within objects
app.use(express.static("public"))
// Above line would serve all files/folders inside of the 'public' directory(they can be accessed by browser directly using url)
app.use(cookieParser())
//add cookie to res and req

//routes

import userRouter from "./routes/user.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import likeRouter from "./routes/like.routes.js"
import commentRouter from "./routes/comment.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import videoRouter from "./routes/video.routes.js"

//routes declaration
app.use("/api/v1/users", userRouter) //The app.use() function is used to mount the specified middleware function(s) at the path that is being specified.
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/like", likeRouter)
app.use("/api/v1/comment", commentRouter)
app.use("/api/v1/subscription", subscriptionRouter)
app.use("/api/v1/tweet", tweetRouter)
app.use("/api/v1/video", videoRouter)

export { app }



