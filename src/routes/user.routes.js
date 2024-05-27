import { Router } from "express"
import { registerUser,
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
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()

//The router.route() function returns an instance of a single route that you can then use to handle HTTP verbs with optional middleware.
router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount: 1
        },
        {
            name:"coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )  //tested

router.route("/login").post(loginUser) //tested

//secured routes
router.route("/logout").post(verifyJWT, logOutUser)  //tested
router.route("/refreshToken").post(refreshAccessToken)

//upload.fields()is used to upload images from different fields of a form

router.route("/changePassword").post(verifyJWT, changeCurrentPassword)  //tested
router.route("/currentUser").get(verifyJWT, getCurrentUser) //tested
router.route("/updateAccountDetails").patch(verifyJWT, updateAccountDetails) //tested
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar) 
router.route("/coverImage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
router.route("/channel/:username").get(verifyJWT, getUserChannelProfile) 
router.route("/watchHistory").get(verifyJWT, getWatchHistory)



// app.post(path, callback [, callback ...])   
// Path: The path for which the middleware function is invoked and can be any of:
    // A string represents a path.
    // A path pattern.
    // A regular expression pattern to match paths.
    // An array of combinations of any of the above.
// Callback: Callback functions can be:
    // A middleware function.
    // A series of middleware functions (separated by commas).
    // An array of middleware functions.
    // A combination of all of the above.
 
export default router 