import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../errors/ApiError";
import UserModel from "../model/UserModel";
import { AppConfig } from "../../config/AppConfig";
import { ACCESS_COOKIE } from "../../utilities/auth";
import { type UserRole, type UserStatus } from "../../types/User";

export default function Auth(){
    return async (req: Request, _: Response, next: NextFunction) => {
        try{
            // the browser sends the cookie. Postman or other apps can use the Authorization header
            let token: string | undefined = req.cookies?.[ACCESS_COOKIE] || req.headers.authorization;
            if(!token){
                throw new ApiError("Please login first", 401)
            }
            token = token.replace("Bearer ", "");

            const verifiedData = jwt.verify(token, AppConfig.jwtSecret) as { sub: string, typ: string };
            if(verifiedData.typ !== "Bearer"){
                throw new ApiError("Invalid token type", 401)
            }

            const userDetail = await UserModel.findById(verifiedData.sub).lean();
            if(!userDetail){
                throw new ApiError("User not found", 401)
            }
            // a suspended user is locked out even if the token is still valid
            if(userDetail.status !== "active"){
                throw new ApiError("Your account is suspended", 403)
            }

            req.loggedInUser = {
                _id: String(userDetail._id),
                fullName: userDetail.fullName,
                username: userDetail.username,
                role: userDetail.role as UserRole,
                phone: userDetail.phone,
                status: userDetail.status as UserStatus,
            };
            next();
        }catch(exception){
            // TokenExpiredError is a kind of JsonWebTokenError, so it must be checked first
            if(exception instanceof jwt.TokenExpiredError){
                next(new ApiError("Token expired, please login again", 401))
            }else if(exception instanceof jwt.JsonWebTokenError){
                next(new ApiError("Invalid token", 401))
            }else{
                next(exception)
            }
        }
    }
}