import { type Request, type Response, type NextFunction } from "express";
import UserModel from "../model/UserModel";
import ShopModel from "../model/ShopModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { escapeRegex, getPagination } from "../../utilities/query";

export default class UserController{
    /**
     * @description Admin: all users. ?search= (name or email)  ?role=customer|seller|admin  ?status=active|suspended
     */
    async getAllUsers(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};

            if(req.query.search){
                const text = new RegExp(escapeRegex(String(req.query.search)), "i");
                filter.$or = [{ fullName: text }, { username: text }];
            }
            if(req.query.role){
                filter.role = String(req.query.role).toLowerCase();
            }
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [users, count] = await Promise.all([
                // the password is never returned (the model hides it)
                UserModel.find(filter, { fullName: 1, username: 1, role: 1, phone: 1, status: 1, createdAt: 1 }, {
                    sort: { createdAt: -1, _id: -1 },
                    skip: skip,
                    limit: limit,
                }).lean(),
                UserModel.countDocuments(filter),
            ]);

            // sellers: show their shop next to them
            const shops = await ShopModel.find(
                { owner: { $in: users.map((user) => user._id) } },
                { owner: 1, name: 1, slug: 1, status: 1 }
            ).lean();
            const shopOf = new Map(shops.map((shop) => [String(shop.owner), shop]));

            res.json({
                result: users.map((user) => ({ ...user, shop: shopOf.get(String(user._id)) ?? null })),
                message: "User List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: suspend or reactivate an account. A suspended user is locked out at once
     */
    async updateUserStatus(req: Request, res: Response, next: NextFunction){
        try{
            const admin = req.loggedInUser as IUserDetail;
            const target = await UserModel.findById(req.params.userId as string, { fullName: 1, username: 1, role: 1, status: 1 });
            if(!target){
                throw new ApiError("User not found", 404)
            }
            if(String(target._id) === admin._id){
                throw new ApiError("Validation Failed", 400, { status: "You cannot change your own status" })
            }
            if(target.role === "admin"){
                throw new ApiError("Admin accounts cannot be suspended here", 403)
            }

            await UserModel.updateOne({ _id: target._id }, { $set: { status: req.body.status } });

            res.json({
                result: {
                    _id: target._id,
                    fullName: target.fullName,
                    username: target.username,
                    role: target.role,
                    status: req.body.status,
                },
                message: req.body.status === "suspended" ? "User suspended" : "User reactivated",
            })
        }catch(exception){
            next(exception)
        }
    }
}