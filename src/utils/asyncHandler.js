// const asyncHandler=(func) => (res, req, next) => {
//     Promise.resolve(func(res, req, next)).catch((err) => next(err))
// }

export { asyncHandler }


const asyncHandler=(func) => async (req, res, next) => {
    try{
        await func(req, res, next)  
    }catch(err){
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        })
    }
}