class ApiError extends Error{
    constructor(
        statusCode,
        message="something went wrong",
        errors=[],
        stack=""
    ){
        super(message)
        this.statusCode=statusCode
        this.errors=errors
        this.data=null
        this.success=false

        if(stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this, this.constructor)   ///no idea what this is
        }
    }
}

export { ApiError }