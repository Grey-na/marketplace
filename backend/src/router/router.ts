import { Router } from "express";
import HealthCheckController from "../app/controllers/HealthCheckController";
import AuthController from "../app/controllers/AuthController";
import { validateBody } from "../app/middlewares/Validator";
import Auth from "../app/middlewares/Auth";
import Allow from "../app/middlewares/Allow";
import { authLimiter } from "../app/middlewares/RateLimiter";
import { LoginSchema, RegistrationSchema } from "../app/request/AuthRequest";

const router: Router = Router();

const healthCtrl = new HealthCheckController();
const authCtrl = new AuthController();

//Healthcheck
router.get("/healthcheck", healthCtrl.handleHealthCheck);

//Auth (the limiter runs first, so spam never reaches the database)
router.post("/auth/register", authLimiter, validateBody(RegistrationSchema), authCtrl.register)
router.post("/auth/login", authLimiter, validateBody(LoginSchema), authCtrl.login)
router.post("/auth/refresh", authLimiter, authCtrl.refresh)
router.get("/auth/me", Auth(), authCtrl.myProfile)
router.post("/auth/logout", authCtrl.logout)

// TEMPORARY: only for testing roles. Delete after Step 2 testing.
router.get("/test/admin-only", Auth(), Allow("admin"), (req, res) => {
    res.json({ result: req.loggedInUser, message: "You are an admin" })
})

export default router;