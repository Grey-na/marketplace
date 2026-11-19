import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import OrderModel from "../model/OrderModel";
import PaymentModel from "../model/PaymentModel";
import ShopOrderModel from "../model/ShopOrderModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { AppConfig } from "../../config/AppConfig";
import { createEsewaPayment, getEsewaPayForm, verifyEsewaPayment } from "../services/PaymentService";
import { getPagination } from "../../utilities/query";

const UUID_FORMAT = /^[A-Za-z0-9-]{10,80}$/;

const escapeHtml = (text: string): string =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const resultUrl = (outcome: string, orderNo: string | null) => {
    const query = new URLSearchParams({ status: outcome === "paid" ? "success" : outcome, order: orderNo ?? "" });
    return `${AppConfig.paymentResultUrl}?${query.toString()}`;
}

// the callbacks never show an error page: whatever happens, the customer lands on the result page
const handleCallback = async (req: Request, res: Response) => {
    const uuid = String(req.params.transactionUuid ?? "");
    if(!UUID_FORMAT.test(uuid)){
        return res.redirect(resultUrl("failed", null));
    }
    try{
        // eSewa adds ?data=... to the redirect. We do not use it: the status check is the truth
        const result = await verifyEsewaPayment(uuid);
        return res.redirect(resultUrl(result.outcome, result.orderNo));
    }catch(error){
        console.error("Payment callback failed", error)
        return res.redirect(resultUrl("failed", null));
    }
}

export default class PaymentController{
    /**
     * @description The "redirecting to eSewa" page: a signed form that submits itself
     */
    async esewaPayPage(req: Request, res: Response, next: NextFunction){
        try{
            const uuid = String(req.params.transactionUuid ?? "");
            if(!UUID_FORMAT.test(uuid)){
                throw new ApiError("Payment not found", 404)
            }
            const { formUrl, fields } = await getEsewaPayForm(uuid);

            // this page needs a self-submitting form, which the default security headers forbid.
            // So it gets its own strict policy: one script (with a one-time nonce) and a form that may post only to eSewa
            const nonce = crypto.randomBytes(16).toString("base64");
            res.setHeader("Content-Security-Policy",
                `default-src 'none'; script-src 'nonce-${nonce}'; form-action ${new URL(formUrl).origin}; base-uri 'none'`);

            const inputs = Object.entries(fields)
                .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}">`)
                .join("\n");

            res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Redirecting to eSewa</title></head>
<body>
<p>Redirecting you to eSewa...</p>
<form id="esewa" method="POST" action="${escapeHtml(formUrl)}">
${inputs}
<noscript><button type="submit">Continue to eSewa</button></noscript>
</form>
<script nonce="${nonce}">document.getElementById("esewa").submit();</script>
</body></html>`);
        }catch(exception){
            next(exception)
        }
    }

    async esewaSuccess(req: Request, res: Response){
        return handleCallback(req, res);
    }

    async esewaFailure(req: Request, res: Response){
        return handleCallback(req, res);
    }

    /**
     * @description A simple result page. Later, PAYMENT_RESULT_URL points to a page of the frontend instead
     */
    resultPage(req: Request, res: Response){
        const status = ["success", "pending", "failed"].includes(String(req.query.status)) ? String(req.query.status) : "failed";
        const orderNo = /^ORD-[A-Za-z0-9-]{1,40}$/.test(String(req.query.order)) ? String(req.query.order) : "";

        const text: Record<string, { title: string; body: string }> = {
            success: { title: "Payment successful", body: "Thank you! Your order is confirmed and the shop will start preparing it." },
            pending: { title: "Payment is being checked", body: "We could not confirm your payment yet. If money was taken, your order will be confirmed shortly." },
            failed: { title: "Payment not completed", body: "Your payment was not completed. You can try again from your order page." },
        };
        const message = text[status];

        res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(message.title)}</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:15vh auto;text-align:center">
<h1>${escapeHtml(message.title)}</h1>
<p>${escapeHtml(message.body)}</p>
${orderNo ? `<p>Order: <strong>${escapeHtml(orderNo)}</strong></p>` : ""}
</body></html>`);
    }

    /**
     * @description Customer: pay again for an order that is still waiting for payment (a new attempt)
     */
    async startEsewaPayment(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const order = await OrderModel.findOne({ _id: req.params.orderId as string, user: user._id });
            if(!order){
                throw new ApiError("Order not found", 404)
            }
            if(order.payment?.method !== "esewa" || order.status !== "awaiting_payment"){
                throw new ApiError("This order is not waiting for an online payment", 400)
            }
            const expiresAt = new Date(order.createdAt).getTime() + AppConfig.paymentExpiryMinutes * 60 * 1000;
            if(Date.now() > expiresAt){
                throw new ApiError("The time to pay for this order has run out", 400)
            }

            res.json({
                result: await createEsewaPayment(order),
                message: "Payment started",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== ADMIN ======================

    /**
     * @description Admin: payment attempts. ?status=refund_needed shows the ones that need attention
     */
    async getPayments(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [rows, count] = await Promise.all([
                PaymentModel.find(filter, { rawResponse: 0 }, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("order", "orderNo total status payment")
                    .populate("user", "fullName username phone")
                    .lean(),
                PaymentModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Payment List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: parcels that need a refund (default: pending ones)
     */
    async getRefunds(req: Request, res: Response, next: NextFunction){
        try{
            const status = req.query.status ? String(req.query.status).toLowerCase() : "pending";
            const { page, limit, skip } = getPagination(req, 20, 100);
            const filter: Record<string, unknown> = { "refund.status": status };

            const [rows, count] = await Promise.all([
                ShopOrderModel.find(filter, { items: 0, timeline: 0 }, { sort: { updatedAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("order", "orderNo payment")
                    .populate("shop", "_id name slug")
                    .populate("user", "fullName username phone")
                    .lean(),
                ShopOrderModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Refund List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: record that a refund was paid (after doing it in the eSewa merchant portal)
     */
    async markRefunded(req: Request, res: Response, next: NextFunction){
        try{
            const shopOrder = await ShopOrderModel.findOneAndUpdate(
                { _id: req.params.shopOrderId as string, "refund.status": "pending" },
                { $set: { "refund.status": "refunded", "refund.note": req.body.note ?? null, "refund.refundedAt": new Date() } },
                { new: true }
            );
            if(!shopOrder){
                throw new ApiError("No pending refund found for this order", 404)
            }
            res.json({
                result: shopOrder,
                message: "Refund recorded",
            })
        }catch(exception){
            next(exception)
        }
    }
}