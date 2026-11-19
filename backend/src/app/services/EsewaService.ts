import crypto from "crypto";
import { AppConfig } from "../../config/AppConfig";
import ApiError from "../errors/ApiError";

// eSewa works in rupees, we store paisa: 224910 -> "2249.10", 250000 -> "2500"
export const toRupees = (paisa: number): string => {
    return paisa % 100 === 0 ? String(paisa / 100) : (paisa / 100).toFixed(2);
}

// HMAC-SHA256 over exactly this text, in exactly this order, as base64
const sign = (totalAmount: string, transactionUuid: string): string => {
    if(!AppConfig.esewa.secretKey){
        throw new ApiError("Online payment is not configured", 503)
    }
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${AppConfig.esewa.productCode}`;
    return crypto.createHmac("sha256", AppConfig.esewa.secretKey).update(message).digest("base64");
}

/**
 * @description The signed fields the customer's browser posts to eSewa
 */
export const buildEsewaFormFields = (data: { subtotal: number; deliveryCharge: number; total: number; transactionUuid: string }) => {
    const totalAmount = toRupees(data.total);
    const fields: Record<string, string> = {
        amount: toRupees(data.subtotal),
        tax_amount: "0",
        product_service_charge: "0",
        product_delivery_charge: toRupees(data.deliveryCharge),
        total_amount: totalAmount,
        transaction_uuid: data.transactionUuid,
        product_code: AppConfig.esewa.productCode,
        // the uuid is in the PATH, because eSewa adds its own ?data=... to the end of these URLs
        success_url: `${AppConfig.backendUrl}/api/payments/esewa/success/${data.transactionUuid}`,
        failure_url: `${AppConfig.backendUrl}/api/payments/esewa/failure/${data.transactionUuid}`,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        signature: sign(totalAmount, data.transactionUuid),
    };
    return fields;
}

export type EsewaStatus = {
    status: string;            // COMPLETE, PENDING, AMBIGUOUS, NOT_FOUND, CANCELED, FULL_REFUND ...
    totalAmount: number;       // in rupees
    refId: string | null;
    raw: Record<string, unknown>;
}

/**
 * @description Ask eSewa directly what happened to a payment. This is the truth, not the browser
 */
export const checkEsewaStatus = async (transactionUuid: string, totalPaisa: number): Promise<EsewaStatus> => {
    const query = new URLSearchParams({
        product_code: AppConfig.esewa.productCode,
        total_amount: toRupees(totalPaisa),
        transaction_uuid: transactionUuid,
    });

    const response = await fetch(`${AppConfig.esewa.statusUrl}?${query.toString()}`, {
        signal: AbortSignal.timeout(10000),
    });
    if(!response.ok){
        throw new Error(`eSewa status check returned HTTP ${response.status}`)
    }

    const raw = await response.json() as Record<string, unknown>;
    // the documentation shows two spellings of the field names, so both are read
    return {
        status: String(raw.status ?? ""),
        totalAmount: Number(raw.totalAmount ?? raw.total_amount ?? NaN),
        refId: raw.refId != null ? String(raw.refId) : raw.ref_id != null ? String(raw.ref_id) : null,
        raw: raw,
    };
}