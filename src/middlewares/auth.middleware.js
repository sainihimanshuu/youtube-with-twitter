import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"
import jwt from "jsonwebtoken"

const verifyJWT = asyncHandler( async(req, _ , next) => {
    //first we need to get the token
    //we can get that in two ways, if req from browser, we can directly access the cookies,
    //but if it is from a mobile application, we use the Authorization header 

    // console.log(req.cookies)

    const token = (req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", ""))

    // console.log(token)

    if(!token)
        throw new ApiError(401, "Unauthorized access")

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken._id).select("-password -refreshToken")

    if(!user)
        throw new ApiError(401, "Invalid token")

    req.user = user
    
    next()
})

export { verifyJWT }