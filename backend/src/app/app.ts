import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "../router/router";
import NotFound from "./middlewares/NotFound";
import ErrorHandler from "./middlewares/ErrorHandler";
import { apiLimiter } from "./middlewares/RateLimiter";
import { AppConfig } from "../config/AppConfig";

const app: Application = express()

app.use("/assets", express.static(AppConfig.uploadDir))

// behind a reverse proxy (production) the real user IP comes from X-Forwarded-For.
// Do NOT enable this on a plain local server, or users can fake their IP.
if(AppConfig.isProduction){
    app.set("trust proxy", 1)
}

//XSS and other security headers
app.use(helmet({
    // images are served from this server but shown on the frontend (another port or domain)
    crossOriginResourcePolicy: { policy: "cross-origin" }
}))

//CORS (only needed when the browser calls this server directly)
app.use(cors({
    origin: AppConfig.clientUrl,
    credentials: true
}))

//Cookies Parser
app.use(cookieParser())

//body parsers
app.use(express.json({
    limit: "2mb"
}))

app.use(express.urlencoded({
    extended: true,
    limit: "2mb"
}))

//uploaded images: public/uploads/images/products/abc.png => /assets/products/abc.png
app.use("/assets", express.static("public/uploads/images"))

//Throttle
app.use("/api", apiLimiter)

//router mounting
app.use("/api", router)

//error, not found(404)
app.use(NotFound)

app.use(ErrorHandler)

export default app;