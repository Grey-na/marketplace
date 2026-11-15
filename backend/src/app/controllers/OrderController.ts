import { type Request, type Response, type NextFunction } from "express";
import OrderModel from "../model/OrderModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ShopModel from "../model/ShopModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { CUSTOMER_TRANSITIONS, SELLER_TRANSITIONS } from "../../types/Order";
import { type CheckoutInput } from "../request/OrderRequest";
import { placeOrder } from "../services/CheckoutService";
import { changeShopOrderStatus } from "../services/OrderService";
import { escapeRegex, getPagination } from "../../utilities/query";

// the shop of the logged in seller
const getMyShopId = async (userId: string) => {
    const shop = await ShopModel.findOne({ owner: userId }, { _id: 1 }).lean();
    if(!shop){
        throw new ApiError("Create your shop first", 403)
    }
    return shop._id;
}

// what a seller needs to know about the customer and the order of a parcel
const ORDER_FIELDS = "orderNo address note payment createdAt";

export default class OrderController{
    // ====================== CUSTOMER ======================

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

    /**
     * @description Customer: cancel one parcel (only while it is pending or confirmed). The stock goes back
     */
    async cancelMyShopOrder(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const reason = req.body.reason as string | undefined;

            const shopOrder = await changeShopOrderStatus({
                shopOrderId: req.params.shopOrderId as string,
                ownerFilter: { user: user._id },
                to: "cancelled",
                allowedTransitions: CUSTOMER_TRANSITIONS,
                note: reason ? `Cancelled by customer: ${reason}` : "Cancelled by customer",
            });

            res.json({
                result: shopOrder,
                message: "Order cancelled",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== SELLER ======================

    /**
     * @description Seller: the parcels of my shop, with the customer's name, phone and address
     */
    async getSellerOrders(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shopId = await getMyShopId(user._id);

            const filter: Record<string, unknown> = { shop: shopId };
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [rows, count] = await Promise.all([
                ShopOrderModel.find(filter, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("order", ORDER_FIELDS)
                    .lean(),
                ShopOrderModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "My Shop Orders",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: one parcel of my shop
     */
    async getSellerOrderDetail(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shopId = await getMyShopId(user._id);

            const shopOrder = await ShopOrderModel.findOne({ _id: req.params.shopOrderId as string, shop: shopId })
                .populate("order", ORDER_FIELDS)
                .lean();
            if(!shopOrder){
                throw new ApiError("Order not found", 404)
            }
            res.json({
                result: shopOrder,
                message: "Order detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: move a parcel forward (confirmed, packed, shipped, delivered) or cancel it
     */
    async updateShopOrderStatus(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shopId = await getMyShopId(user._id);
            const { status, note, trackingNo, provider } = req.body;

            // shipment details travel with the status change
            const set: Record<string, unknown> = {};
            if(status === "shipped"){
                set["shipment.status"] = "shipped";
                if(provider){
                    set["shipment.provider"] = provider;
                }
                if(trackingNo){
                    set["shipment.trackingNo"] = trackingNo;
                }
            }
            if(status === "delivered"){
                set["shipment.status"] = "delivered";
            }

            const shopOrder = await changeShopOrderStatus({
                shopOrderId: req.params.shopOrderId as string,
                ownerFilter: { shop: shopId },
                to: status,
                allowedTransitions: SELLER_TRANSITIONS,
                note: status === "cancelled" ? `Cancelled by seller: ${note}` : note,
                set: set,
            });

            res.json({
                result: shopOrder,
                message: "Order status updated",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== ADMIN ======================

    /**
     * @description Admin: all orders. ?status=  ?search=<order number>
     */
    async getAllOrdersForAdmin(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }
            if(req.query.search){
                filter.orderNo = new RegExp(escapeRegex(String(req.query.search)), "i");
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [orders, count] = await Promise.all([
                OrderModel.find(filter, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("user", "fullName username phone")
                    .lean(),
                OrderModel.countDocuments(filter),
            ]);

            const shopOrders = await ShopOrderModel.find(
                { order: { $in: orders.map((order) => order._id) } },
                { order: 1, shop: 1, status: 1, total: 1 }
            ).populate("shop", "_id name slug").lean();

            const result = orders.map((order) => ({
                ...order,
                shopOrders: shopOrders.filter((shopOrder) => String(shopOrder.order) === String(order._id)),
            }));

            res.json({
                result: result,
                message: "Order List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: one order with all its parcels
     */
    async getOrderDetailForAdmin(req: Request, res: Response, next: NextFunction){
        try{
            const order = await OrderModel.findById(req.params.orderId as string)
                .populate("user", "fullName username phone")
                .lean();
            if(!order){
                throw new ApiError("Order not found", 404)
            }
            const shopOrders = await ShopOrderModel.find({ order: order._id })
                .populate("shop", "_id name slug contact")
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