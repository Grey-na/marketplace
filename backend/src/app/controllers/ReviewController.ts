import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import ReviewModel from "../model/ReviewModel";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { getPagination } from "../../utilities/query";
import { getVisibleBase } from "./ProductController";

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * @description Work out the average rating and the number of reviews again, for the product and its shop
 */
const recomputeRatings = async (productId: mongoose.Types.ObjectId, shopId: mongoose.Types.ObjectId) => {
    // ids inside an aggregate are not cast automatically, so they must already be ObjectIds
    const [productAgg] = await ReviewModel.aggregate([
        { $match: { product: productId } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await ProductModel.updateOne({ _id: productId }, {
        $set: {
            "stats.ratingAvg": productAgg ? round1(productAgg.avg) : 0,
            "stats.ratingCount": productAgg ? productAgg.count : 0,
        },
    });

    const [shopAgg] = await ReviewModel.aggregate([
        { $match: { shop: shopId } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await ShopModel.updateOne({ _id: shopId }, {
        $set: {
            ratingAvg: shopAgg ? round1(shopAgg.avg) : 0,
            ratingCount: shopAgg ? shopAgg.count : 0,
        },
    });
}

export default class ReviewController{
    /**
     * @description Customer: review a product that was delivered to me
     */
    async createReview(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const { rating, comment } = req.body;

            const product = await ProductModel.findById(req.params.productId as string, { shop: 1 }).lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            // verified purchase: one of my parcels with this product must be delivered
            const delivered = await ShopOrderModel.findOne(
                { user: user._id, status: "delivered", "items.product": product._id },
                { _id: 1 }
            ).lean();
            if(!delivered){
                throw new ApiError("You can review a product only after it has been delivered to you", 403)
            }

            let review;
            try{
                review = await ReviewModel.create({
                    user: new mongoose.Types.ObjectId(user._id),
                    product: product._id,
                    shop: product.shop,
                    shopOrder: delivered._id,
                    rating: rating,
                    comment: comment ?? null,
                })
            }catch(error){
                if((error as { code?: number }).code === 11000){
                    throw new ApiError("You have already reviewed this product", 409)
                }
                throw error
            }

            await recomputeRatings(product._id, product.shop)

            res.status(201).json({
                result: review,
                message: "Thank you for your review",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Customer: change my own review
     */
    async updateMyReview(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const review = await ReviewModel.findOne({ _id: req.params.reviewId as string, user: user._id });
            if(!review){
                throw new ApiError("Review not found", 404)
            }

            const { rating, comment } = req.body;
            if(rating !== undefined){
                review.rating = rating;
            }
            if(comment !== undefined){
                review.comment = comment;
            }
            await review.save()
            await recomputeRatings(review.product, review.shop)

            res.json({
                result: review,
                message: "Review updated",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Customer: delete my own review
     */
    async deleteMyReview(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const review = await ReviewModel.findOneAndDelete({ _id: req.params.reviewId as string, user: user._id });
            if(!review){
                throw new ApiError("Review not found", 404)
            }
            await recomputeRatings(review.product, review.shop)

            res.json({
                result: review,
                message: "Review deleted",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Public: the reviews of a product (by its slug), newest first
     */
    async getProductReviews(req: Request, res: Response, next: NextFunction){
        try{
            const filter = await getVisibleBase();
            filter.slug = req.params.slug as string;
            const product = await ProductModel.findOne(filter, { _id: 1, stats: 1 }).lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            const { page, limit, skip } = getPagination(req, 10, 50);
            const [reviews, count] = await Promise.all([
                ReviewModel.find(
                    { product: product._id },
                    { user: 1, rating: 1, comment: 1, createdAt: 1 },
                    { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit }
                ).populate("user", "fullName").lean(),
                ReviewModel.countDocuments({ product: product._id }),
            ]);

            res.json({
                result: {
                    ratingAvg: product.stats?.ratingAvg ?? 0,
                    ratingCount: product.stats?.ratingCount ?? 0,
                    reviews: reviews,
                },
                message: "Product Reviews",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }
}