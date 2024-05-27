//bcrypt - library to encrypt/hash passwords
//jwt(json web token) - tokens banate h
//jwt is a bearer token-jiske paas bhi ye token hai, use data ngeh dunga

import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const watchHistoryContent={
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video"
}

const userSchema=new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true  //for enabling searching(it optimizes searching)
        },
        watchHistory: [watchHistoryContent],
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,
            required: true
        },
        coverImage: {
            type:String
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        refreshToken: {
            type: String
        }
    },{timestamps: true})

//no arrow function in pre bcoz in arrow function no reference of this(no context is known)
userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next()

    this.password=await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id: this._id
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User", userSchema)