import { type Request, type Response, type NextFunction } from "express";
import ProductModel from "../model/ProductModel";
import ApiError from "../errors/ApiError";
import { getVisibleBase } from "./ProductController";
import {
    getHiddenGems, getPersonalized, getSimilarProducts, getTrending, hydrate, type Actor,
} from "../services/RecommendationService";

const ANON_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export default class RecommendationController{
    /**
     * @description Home page sections: forYou (personal), trending and hiddenGems.
     * A logged in customer is recognized by the cookie, a visitor by ?anonId=
     */
    async getHome(req: Request, res: Response, next: NextFunction){
        try{
            const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));

            const anonId = String(req.query.anonId ?? "");
            let actor: Actor | null = null;
            if(req.loggedInUser){
                actor = { userId: req.loggedInUser._id };
            }else if(ANON_ID.test(anonId)){
                actor = { anonId: anonId };
            }

            const [forYou, trending, gems] = await Promise.all([
                getPersonalized(actor, limit),
                getTrending(limit),
                getHiddenGems(6),
            ]);
            const [forYouCards, trendingCards, gemCards] = await Promise.all([
                hydrate(forYou.entries),
                hydrate(trending),
                hydrate(gems),
            ]);

            res.json({
                result: {
                    personalized: forYou.personalized,
                    forYou: forYouCards,
                    trending: trendingCards,
                    hiddenGems: gemCards,
                },
                message: "Recommendations",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Similar products for a product page (they come mostly from other shops)
     */
    async getSimilar(req: Request, res: Response, next: NextFunction){
        try{
            const filter = await getVisibleBase();
            filter.slug = req.params.slug as string;
            const product = await ProductModel.findOne(filter, { _id: 1 }).lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 8));
            const entries = await getSimilarProducts(String(product._id), limit);

            res.json({
                result: await hydrate(entries),
                message: "Similar Products",
            })
        }catch(exception){
            next(exception)
        }
    }
}