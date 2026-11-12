import { type NextFunction, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../model/UserModel";
import ApiError from "../errors/ApiError";
import { AppConfig } from "../../config/AppConfig";
import { REFRESH_COOKIE, setAuthCookies, clearAuthCookies } from "../../utilities/auth";

class AuthController{
    async register(req: Request, res: Response, next: NextFunction){
        try{
            // take only the fields we allow. Never pass req.body straight into the model
            const { fullName, username, password, role, phone } = req.body;

            // async hash does not block the server while it works
            const hashedPassword = await bcrypt.hash(password, 12);

            const user = await UserModel.create({
                fullName, username, password: hashedPassword, role, phone
            });

            res.status(201).json({
                result: {
                    _id: user._id,
                    fullName: user.fullName,
                    username: user.username,
                    role: user.role,
                    phone: user.phone,
                },
                message: "Register Success",
            })
        }catch(exception){
            // a duplicate email is turned into a 400 by ErrorHandler
            next(exception)
        }
    }

    async login(req: Request, res: Response, next: NextFunction){
        try{
            const { username, password } = req.body;

            // password is select:false, so we ask for it here on purpose
            const userDetail = await UserModel.findOne({ username: username }).select("+password");

            // one message for both cases, so nobody can find out which emails are registered
            if(!userDetail || !(await bcrypt.compare(password, userDetail.password))){
                throw new ApiError("Invalid username or password", 401)
            }
            if(userDetail.status !== "active"){
                throw new ApiError("Your account is suspended", 403)
            }

            setAuthCookies(res, String(userDetail._id))

            res.json({
                result: {
                    _id: userDetail._id,
                    fullName: userDetail.fullName,
                    username: userDetail.username,
                    role: userDetail.role,
                },
                message: "Login Successful",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Use the refresh cookie to get a new access token without logging in again
     */
    async refresh(req: Request, res: Response, next: NextFunction){
        try{
            const token = req.cookies?.[REFRESH_COOKIE];
            if(!token){
                throw new ApiError("Refresh token not found", 401)
            }

            let verifiedData: { sub: string, typ: string };
            try{
                verifiedData = jwt.verify(token, AppConfig.jwtRefreshSecret) as { sub: string, typ: string };
            }catch{
                throw new ApiError("Session expired, please login again", 401)
            }
            if(verifiedData.typ !== "Refresh"){
                throw new ApiError("Invalid token type", 401)
            }

            const userDetail = await UserModel.findById(verifiedData.sub);
            if(!userDetail || userDetail.status !== "active"){
                throw new ApiError("Session expired, please login again", 401)
            }

            // new access token and new refresh token (the session slides forward)
            setAuthCookies(res, String(userDetail._id))
            res.json({
                result: null,
                message: "Token refreshed",
            })
        }catch(exception){
            next(exception)
        }
    }

    myProfile(req: Request, res: Response){
        res.json({
            result: req.loggedInUser,
            message: "User Profile",
        })
    }

    logout(_: Request, res: Response){
        clearAuthCookies(res)
        res.json({
            result: null,
            message: "Logout Successful",
        })
    }
}

export default AuthController