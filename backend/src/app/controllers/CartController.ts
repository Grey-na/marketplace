import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import CartModel from "../model/CartModel";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { DELIVERY_CHARGE_PAISA, MAX_CART_ITEMS, MAX_QTY_PER_ITEM } from "../../types/Order";
import { isBuyable } from "../../utilities/catalog";

/**
 * @description The cart for the screen: every line with live price and stock, and the totals
 */
const buildCartView = async (userId: string) => {
    const cart = await CartModel.findOne({ user: userId }).lean();
    const cartItems = cart?.items ?? [];

    const products = await ProductModel.find(
        { _id: { $in: cartItems.map((item) => item.product) } },
        { title: 1, slug: 1, price: 1, discount: 1, afterDiscount: 1, stock: 1, status: 1, isBlocked: 1, shop: 1, images: 1 }
    ).lean();
    const shops = await ShopModel.find(
        { _id: { $in: products.map((product) => product.shop) } },
        { name: 1, slug: 1, status: 1 }
    ).lean();

    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const shopMap = new Map(shops.map((shop) => [String(shop._id), shop]));

    const lines = cartItems.map((item) => {
        const product = productMap.get(String(item.product));
        if(!product){
            // the product was deleted
            return {
                productId: String(item.product), title: "This product is no longer available", slug: null, image: null,
                shop: null, unitPrice: 0, originalPrice: 0, discount: 0, quantity: item.quantity, stock: 0, lineTotal: 0,
                problem: "unavailable" as string | null,
            };
        }
        const shop = shopMap.get(String(product.shop));

        let problem: string | null = null;
        if(!isBuyable(product, shop)){
            problem = "unavailable";
        }else if(product.stock < 1){
            problem = "out_of_stock";
        }else if(product.stock < item.quantity){
            problem = "not_enough_stock";
        }

        return {
            productId: String(product._id),
            title: product.title,
            slug: product.slug,
            image: product.images?.[0]?.url ?? null,
            shop: shop ? { _id: shop._id, name: shop.name, slug: shop.slug } : null,
            unitPrice: product.afterDiscount,
            originalPrice: product.price,
            discount: product.discount,
            quantity: item.quantity,
            stock: product.stock,
            lineTotal: product.afterDiscount * item.quantity,
            problem: problem,
        };
    });

    // totals count only the lines that can really be ordered
    const goodLines = lines.filter((line) => line.problem === null);
    const subtotal = goodLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const shopCount = new Set(goodLines.map((line) => String(line.shop?._id))).size;
    const deliveryCharge = shopCount * DELIVERY_CHARGE_PAISA;

    return {
        items: lines,
        itemCount: lines.length,
        hasProblems: lines.some((line) => line.problem !== null),
        shopCount: shopCount,
        subtotal: subtotal,
        deliveryCharge: deliveryCharge,
        total: subtotal + deliveryCharge,
    };
}

export default class CartController{
    async getCart(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            res.json({
                result: await buildCartView(user._id),
                message: "My Cart",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Add a product. Adding it again increases the quantity
     */
    async addItem(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const { productId, quantity } = req.body;

            const product = await ProductModel.findById(productId).lean();
            const shop = product ? await ShopModel.findById(product.shop, { status: 1 }).lean() : null;
            if(!product || !isBuyable(product, shop)){
                throw new ApiError("Product not found", 404)
            }
            if(product.stock < 1){
                throw new ApiError("Validation Failed", 400, { quantity: "This product is out of stock" })
            }

            const cart = (await CartModel.findOne({ user: user._id }))
                ?? new CartModel({ user: new mongoose.Types.ObjectId(user._id), items: [] });

            const existing = cart.items.find((item) => String(item.product) === productId);
            const newQuantity = (existing?.quantity ?? 0) + quantity;

            if(newQuantity > MAX_QTY_PER_ITEM){
                throw new ApiError("Validation Failed", 400, { quantity: `You can buy at most ${MAX_QTY_PER_ITEM} pieces of one product` })
            }
            if(newQuantity > product.stock){
                throw new ApiError("Validation Failed", 400, { quantity: `Only ${product.stock} available` })
            }

            if(existing){
                existing.quantity = newQuantity;
            }else{
                if(cart.items.length >= MAX_CART_ITEMS){
                    throw new ApiError("Validation Failed", 400, { cart: `Your cart can hold at most ${MAX_CART_ITEMS} different products` })
                }
                cart.items.push({ product: product._id, quantity: quantity })
            }
            await cart.save()

            res.status(201).json({
                result: await buildCartView(user._id),
                message: "Added to cart",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Set the quantity of a product that is already in the cart
     */
    async updateItem(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const productId = req.params.productId as string;
            const { quantity } = req.body;

            const cart = await CartModel.findOne({ user: user._id });
            const line = cart?.items.find((item) => String(item.product) === productId);
            if(!cart || !line){
                throw new ApiError("This product is not in your cart", 404)
            }

            const product = await ProductModel.findById(productId).lean();
            const shop = product ? await ShopModel.findById(product.shop, { status: 1 }).lean() : null;
            if(!product || !isBuyable(product, shop)){
                throw new ApiError("This product is no longer available. Please remove it from your cart.", 400)
            }
            if(quantity > product.stock){
                throw new ApiError("Validation Failed", 400, { quantity: `Only ${product.stock} available` })
            }

            line.quantity = quantity;
            await cart.save()

            res.json({
                result: await buildCartView(user._id),
                message: "Cart updated",
            })
        }catch(exception){
            next(exception)
        }
    }

    async removeItem(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const result = await CartModel.updateOne(
                { user: user._id },
                { $pull: { items: { product: req.params.productId as string } } }
            );
            if(result.modifiedCount === 0){
                throw new ApiError("This product is not in your cart", 404)
            }
            res.json({
                result: await buildCartView(user._id),
                message: "Removed from cart",
            })
        }catch(exception){
            next(exception)
        }
    }

    async clearCart(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            await CartModel.deleteOne({ user: user._id })
            res.json({
                result: await buildCartView(user._id),
                message: "Cart cleared",
            })
        }catch(exception){
            next(exception)
        }
    }
}