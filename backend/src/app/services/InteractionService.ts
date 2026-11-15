import mongoose from "mongoose";
import InteractionModel from "../model/InteractionModel";
import { type InteractionType } from "../../types/Interaction";

type InteractionData = {
    user?: string | null;
    anonId?: string | null;
    product: mongoose.Types.ObjectId;
    shop: mongoose.Types.ObjectId;
    type: InteractionType;
}

/**
 * @description Save one event. Tracking must never break a real action (like placing an order),
 * so a failure is only printed. Call it without await: void logInteraction({...})
 */
export const logInteraction = async (data: InteractionData) => {
    try{
        await InteractionModel.create({
            user: data.user ?? null,
            anonId: data.anonId ?? null,
            product: data.product,
            shop: data.shop,
            type: data.type,
        })
    }catch(error){
        console.error("Interaction not saved", error)
    }
}