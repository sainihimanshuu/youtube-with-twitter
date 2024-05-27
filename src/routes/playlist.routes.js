import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import  {
    createPlaylist,
    getPlayListById,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getUserPlaylist
} from "../controllers/playlist.controller.js"

const router = Router()

//create playlist - only user can do  done
//delete playlist - only user can do  done
//add video to playlist - only user can do   done
//remove video from playlist - only user can do done 
//get user playlist - only user can do  done
//update playlist, change name and description, - only a user can do done
//getplaylist by id done

router.use(verifyJWT) // applies this middleware to all the routes

router.route("/createPlaylist").post(createPlaylist)  //tested
router.route("/:playlistId")
    .get(getPlayListById)  //tested
    .patch(updatePlaylist)  //tested
    .delete(deletePlaylist)  //tested

router.route("/addVideo/:videoId/:playlistId").patch(addVideoToPlaylist)
router.route("/removeVideo/:videoId/:playlistId").patch(removeVideoFromPlaylist)

router.route("/:userId").get(getUserPlaylist)
export default router
