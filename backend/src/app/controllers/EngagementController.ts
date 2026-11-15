import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import WishlistModel from "../model/WishlistModel";
import FollowModel from "../model/FollowModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { isBuyable } from "../../utilities/catalog";
import { getPagination } from "../../utilities/query";
import { getVisibleBase } from "./ProductController";
import { logInteraction } from "../services/InteractionService";

const MAX_WISHLIST = 100;

const isDuplicateKeyError = (error: unknown): boolean => {
    return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export default class EngagementController{
    // ====================== WISHLIST ======================

    /**
     * @description My wishlist: the products I saved that can still be bought, newest first
     */
    async getWishlist(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const wishlist = await WishlistModel.findOne({ user: user._id }).lean();
            const ids = wishlist?.products ?? [];

            const base = await getVisibleBase();
            const rows = await ProductModel.find(
                { ...base, _id: { $in: ids } },
                { createdBy: 0, updatedBy: 0, isBlocked: 0, blockReason: 0, __v: 0 }
            )
                .populate("category", "_id title slug color")
                .populate("shop", "_id name slug logo isVerified")
                .lean();

            // the most recently saved product first
            const position = new Map(ids.map((id, index) => [String(id), index]));
            rows.sort((a, b) => (position.get(String(b._id)) ?? 0) - (position.get(String(a._id)) ?? 0));

            res.json({
                result: rows,
                message: "My Wishlist",
            })
        }catch(exception){
            next(exception)
        }
    }

    async addToWishlist(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const productId = req.params.productId as string;

            const product = await ProductModel.findById(productId, { status: 1, isBlocked: 1, shop: 1 }).lean();
            const shop = product ? await ShopModel.findById(product.shop, { status: 1 }).lean() : null;
            if(!product || !isBuyable(product, shop)){
                throw new ApiError("Product not found", 404)
            }

            // a wishlist holds at most MAX_WISHLIST products
            const existing = await WishlistModel.findOne({ user: user._id }, { products: 1 }).lean();
            const alreadyThere = existing?.products.some((id) => String(id) === productId) ?? false;
            if(!alreadyThere && (existing?.products.length ?? 0) >= MAX_WISHLIST){
                throw new ApiError("Validation Failed", 400, { wishlist: `Your wishlist can hold at most ${MAX_WISHLIST} products` })
            }

            // $addToSet never adds the same product twice
            const result = await WishlistModel.updateOne(
                { user: user._id },
                { $addToSet: { products: product._id } },
                { upsert: true }
            );
            const added = result.upsertedCount === 1 || result.modifiedCount === 1;

            if(added){
                await ProductModel.updateOne({ _id: product._id }, { $inc: { "stats.wishlists": 1 } })
                void logInteraction({ user: user._id, product: product._id, shop: product.shop, type: "wishlist" })
            }

            res.status(added ? 201 : 200).json({
                result: { wishlisted: true },
                message: added ? "Added to wishlist" : "Already in your wishlist",
            })
        }catch(exception){
            next(exception)
        }
    }

    async removeFromWishlist(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const productId = req.params.productId as string;

            const result = await WishlistModel.updateOne(
                { user: user._id },
                { $pull: { products: productId } }
            );
            if(result.modifiedCount === 1){
                await ProductModel.updateOne({ _id: productId }, { $inc: { "stats.wishlists": -1 } })
            }

            res.json({
                result: { wishlisted: false },
                message: "Removed from wishlist",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== FOLLOWS ======================

    /**
     * @description The shops I follow (only shops that are still approved)
     */
    async getMyFollows(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const { page, limit, skip } = getPagination(req, 20, 50);

            const [follows, count] = await Promise.all([
                FollowModel.find({ user: user._id }, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate({
                        path: "shop",
                        match: { status: "approved" },
                        select: "_id name slug logo cover isVerified description followerCount ratingAvg ratingCount",
                    })
                    .lean(),
                FollowModel.countDocuments({ user: user._id }),
            ]);

            res.json({
                result: follows.map((follow) => follow.shop).filter((shop) => shop),
                message: "Shops I follow",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    async followShop(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findOne({ slug: req.params.slug as string, status: "approved" }, { _id: 1 }).lean();
            if(!shop){
                throw new ApiError("Shop not found", 404)
            }

            let added = true;
            try{
                await FollowModel.create({ user: new mongoose.Types.ObjectId(user._id), shop: shop._id })
            }catch(error){
                // the unique index says: already following. Not an error for the customer
                if(!isDuplicateKeyError(error)){
                    throw error
                }
                added = false;
            }
            if(added){
                await ShopModel.updateOne({ _id: shop._id }, { $inc: { followerCount: 1 } })
            }

            res.status(added ? 201 : 200).json({
                result: { following: true },
                message: added ? "You are now following this shop" : "You already follow this shop",
            })
        }catch(exception){
            next(exception)
        }
    }

    async unfollowShop(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findOne({ slug: req.params.slug as string }, { _id: 1 }).lean();
            if(!shop){
                throw new ApiError("Shop not found", 404)
            }

            const result = await FollowModel.deleteOne({ user: user._id, shop: shop._id });
            if(result.deletedCount === 1){
                await ShopModel.updateOne({ _id: shop._id }, { $inc: { followerCount: -1 } })
            }

            res.json({
                result: { following: false },
                message: "You unfollowed this shop",
            })
        }catch(exception){
            next(exception)
        }
    }
}