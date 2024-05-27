import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET // Click 'View Credentials' below to copy your API secret
});

const uploadOnCloundinary=async (localFilePath) => {
    try{
        if(!localFilePath) return null
        //upload the file on cloudinary
        const uploadResult = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "image"
        })
        //file has been uploaded successfully
        fs.unlinkSync(localFilePath) 
        return uploadResult
    }catch(err){
        //for safe cleaning purpose
        fs.unlinkSync(localFilePath) //removes the locally saved temporary files 
        //as the upload operation failed  
        return null
    }
}

export { uploadOnCloundinary }
 