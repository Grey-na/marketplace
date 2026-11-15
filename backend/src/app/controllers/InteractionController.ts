import { type Request, type Response, type NextFunction } from "express";
import ProductModel from "../model/ProductModel";
import InteractionModel from "../model/InteractionModel";
import ApiError from "../errors/ApiError";

// the same visitor looking at the same product again within this time is not counted again
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

export default class InteractionController{
    /**
     * @description Record that someone viewed or clicked a product. Works for visitors (anonId) and customers
     */
    async track(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser;
            const { productId, type, anonId } = req.body;

            if(!user && !anonId){
                throw new ApiError("Validation Failed", 400, { anonId: "anonId is required when you are not logged in" })
            }

            const product = await ProductModel.findOne(
                { _id: productId, status: "active", isBlocked: false },
                { shop: 1 }
            ).lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            // who did it: a logged in customer wins over the anonymous id
            const actor = user ? { user: user._id } : { anonId: anonId };

            if(type === "view"){
                const since = new Date(Date.now() - VIEW_COOLDOWN_MS);
                const alreadyCounted = await InteractionModel.exists({
                    product: product._id, type: "view", ...actor, createdAt: { $gte: since },
                });
                if(alreadyCounted){
                    return res.json({ result: { recorded: false }, message: "Already counted" })
                }
                await ProductModel.updateOne({ _id: product._id }, { $inc: { "stats.views": 1 } })
            }

            await InteractionModel.create({
                ...actor,
                product: product._id,
                shop: product.shop,
                type: type,
            })

            res.status(201).json({
                result: { recorded: true },
                message: "Recorded",
            })
        }catch(exception){
            next(exception)
        }
    }
}