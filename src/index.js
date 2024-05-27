import dotenv from "dotenv"
import { app } from './app.js'
import connectDB from "./db/index.js"

dotenv.config({
    path: "../.env"
})

connectDB()
    .then(() => {
        app.listen(process.env.PORT, () => {
            console.log(`Listening to port ${process.env.PORT}`)
        })  
    })
    .catch((error) => {
        console.log(`MongoDB connection error ${error}`)
    })

// ;(async () => {
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error) => {
//             console.log("ERR: ", error)
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on port ${process.env.PORT}`)
//         })
//     }   
//     catch(error){
//         console.error("DB connection failed", error)
//     }
// })()