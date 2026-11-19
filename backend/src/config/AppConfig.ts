import {config} from "dotenv"
config();

// stop the server at startup if an important value is missing
const required = (name: string): string => {
    const value = process.env[name];
    if(!value){
        throw new Error(`Missing environment variable: ${name}`)
    }
    return value;
}

const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT) || 3005;

export const AppConfig = {
    port: port,
    isProduction: isProduction,
    uploadDir: "public/uploads/images",
    assetsUrl: required("ASSETS_URL"),
    jwtSecret: required("JWT_SECRET"),
    jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    accessTokenMinutes: Number(process.env.ACCESS_TOKEN_MINUTES) || 15,
    refreshTokenDays: 7,

    // where the customer's BROWSER can reach this server (eSewa sends the browser back here)
    backendUrl: process.env.BACKEND_URL || `http://localhost:${port}`,
    // the page the customer sees after paying. Later this becomes a page of the Next.js frontend
    paymentResultUrl: process.env.PAYMENT_RESULT_URL || `http://localhost:${port}/api/payments/result`,
    // an unpaid online order is cancelled after this many minutes, and the stock returns
    paymentExpiryMinutes: Number(process.env.PAYMENT_EXPIRY_MINUTES) || 30,
    paymentSweepSeconds: Number(process.env.PAYMENT_SWEEP_SECONDS) || 300,

    esewa: {
        productCode: process.env.ESEWA_PRODUCT_CODE || "EPAYTEST",
        // the public test key from eSewa's documentation is used only outside production
        secretKey: process.env.ESEWA_SECRET_KEY || (isProduction ? "" : "8gBm/:&EnhH.1/q"),
        formUrl: process.env.ESEWA_FORM_URL || "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        statusUrl: process.env.ESEWA_STATUS_URL || "https://rc.esewa.com.np/api/epay/transaction/status/",
    },
};

export const MongoConfig = {
    url: required("MONGODB_URL"),
    dbName: required("DB_NAME"),
};