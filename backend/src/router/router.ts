import { Router } from "express";
import HealthCheckController from "../app/controllers/HealthCheckController";
import AuthController from "../app/controllers/AuthController";
import CategoryController from "../app/controllers/CategoryController";
import { validateBody } from "../app/middlewares/Validator";
import Uploader from "../app/middlewares/Uploader";
import Auth from "../app/middlewares/Auth";
import Allow from "../app/middlewares/Allow";
import { authLimiter } from "../app/middlewares/RateLimiter";
import { LoginSchema, RegistrationSchema } from "../app/request/AuthRequest";
import { CategoryCreateSchema, CategoryUpdateSchema } from "../app/request/CategoryRequest";

const router: Router = Router();

// every route added to adminRouter needs a logged in admin, so no route can forget the guards
const adminRouter: Router = Router();
adminRouter.use(Auth(), Allow("admin"));

const healthCtrl = new HealthCheckController();
const authCtrl = new AuthController();
const categoryCtrl = new CategoryController();

//Healthcheck
router.get("/healthcheck", healthCtrl.handleHealthCheck);

//Auth (the limiter runs first, so spam never reaches the database)
router.post("/auth/register", authLimiter, validateBody(RegistrationSchema), authCtrl.register)
router.post("/auth/login", authLimiter, validateBody(LoginSchema), authCtrl.login)
router.post("/auth/refresh", authLimiter, authCtrl.refresh)
router.get("/auth/me", Auth(), authCtrl.myProfile)
router.post("/auth/logout", authCtrl.logout)

//Public: categories for the homepage
router.get("/categories/home", categoryCtrl.getCategoryListForHome);

//Admin: categories (the upload runs AFTER the login and role check)
adminRouter.post("/categories", Uploader("/categories").single("image"), validateBody(CategoryCreateSchema), categoryCtrl.createCategory);
adminRouter.get("/categories", categoryCtrl.getAllCategoryData);
adminRouter.get("/categories/:categoryId", categoryCtrl.getCategoryDetail);
adminRouter.put("/categories/:categoryId", Uploader("/categories").single("image"), validateBody(CategoryUpdateSchema), categoryCtrl.updateCategoryDetail);
adminRouter.delete("/categories/:categoryId", categoryCtrl.deleteCategoryDetail);

router.use("/admin", adminRouter);

export default router;