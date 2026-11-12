class ApiError extends Error{
    code?: number;
    result?: Record<string,string>;

    constructor(message: string, code=500, result?: Record<string,string>){
        super(message)
        this.name= "ApiError";
        this.code= code;
        this.result= result;

        Object.setPrototypeOf(this, new.target.prototype)
    }
}

export default ApiError