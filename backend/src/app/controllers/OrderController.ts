import { type Request, type Response, type NextFunction } from "express";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { type CheckoutInput } from "../request/OrderRequest";
import { placeOrder } from "../services/CheckoutService";
import { getPagination } from "../../utilities/query";

export default class OrderController{
    /**
     * @description Customer: place the order for everything in the cart
     */
    async checkout(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const result = await placeOrder(user._id, req.body as CheckoutInput);
            res.status(201).json({
                result: result,
                message: "Order placed successfully",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Customer: my orders, newest first, each with a short summary of its shop parcels
     */
    async getMyOrders(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const filter = { user: user._id };
            const { page, limit, skip } = getPagination(req, 10, 50);

            const [orders, count] = await Promise.all([
                OrderModel.find(filter, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit }).lean(),
                OrderModel.countDocuments(filter),
            ]);

            // one extra query for the parcels of all these orders
            const shopOrders = await ShopOrderModel.find(
                { order: { $in: orders.map((order) => order._id) } },
                { order: 1, shop: 1, status: 1, total: 1, "items.title": 1, "items.image": 1, "items.quantity": 1 }
            ).populate("shop", "_id name slug").lean();

            const result = orders.map((order) => ({
                ...order,
                shopOrders: shopOrders.filter((shopOrder) => String(shopOrder.order) === String(order._id)),
            }));

            res.json({
                result: result,
                message: "My Orders",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Customer: one of my orders with all its parcels. Another customer's order gives 404
     */
    async getMyOrderDetail(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const order = await OrderModel.findOne({ _id: req.params.orderId as string, user: user._id }).lean();
            if(!order){
                throw new ApiError("Order not found", 404)
            }
            const shopOrders = await ShopOrderModel.find({ order: order._id })
                .populate("shop", "_id name slug logo contact")
                .lean();

            res.json({
                result: { ...order, shopOrders: shopOrders },
                message: "Order detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }
}