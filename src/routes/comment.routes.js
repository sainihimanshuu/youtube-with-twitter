import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import  {
    addComment,
    deleteComment,
    updateComment,
    getVideoComments
} from "../controllers/comment.controller.js"

const router = Router()

//addcommment deletecomment edit comment getvidio comments

router.use(verifyJWT)

router.route("/:videoId").get(getVideoComments).post(addComment)  //add aggregate paginate 
router.route("/c/:commentId").delete(deleteComment).patch(updateComment)

export default router