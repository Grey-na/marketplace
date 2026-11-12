import { config } from "dotenv"
config();

// stop the server at startup if an important value is missing
const required = (name: string): string => {
    const value = process.env[name];
    if(!value){
        throw new Error(`Missing environment variable: ${name}`)
    }
    return value;
}

export const AppConfig = {
    port: Number(process.env.PORT) || 3005,
    uploadDir: "public/uploads/images",
    isProduction: process.env.NODE_ENV === "production",
    assetsUrl: required("ASSETS_URL"),
    jwtSecret: required("JWT_SECRET"),
    jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
    clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    accessTokenMinutes: 15,
    refreshTokenDays: 7,
};

export const MongoConfig = {
    url: required("MONGODB_URL"),
    dbName: required("DB_NAME"),
};