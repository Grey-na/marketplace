import { Router } from "express";
import HealthCheckController from "../app/controllers/HealthCheckController";
import AuthController from "../app/controllers/AuthController";
import CategoryController from "../app/controllers/CategoryController";
import ShopController from "../app/controllers/ShopController";
import { validateBody } from "../app/middlewares/Validator";
import Uploader from "../app/middlewares/Uploader";
import Auth from "../app/middlewares/Auth";
import Allow from "../app/middlewares/Allow";
import { authLimiter } from "../app/middlewares/RateLimiter";
import { LoginSchema, RegistrationSchema } from "../app/request/AuthRequest";
import { CategoryCreateSchema, CategoryUpdateSchema } from "../app/request/CategoryRequest";
import { ShopCreateSchema, ShopUpdateSchema, ShopReviewSchema } from "../app/request/ShopRequest";

const router: Router = Router();

// every route added to adminRouter needs a logged in admin, and every route in sellerRouter a logged in seller.
// No route can forget the guards.
const adminRouter: Router = Router();
adminRouter.use(Auth(), Allow("admin"));
const sellerRouter: Router = Router();
sellerRouter.use(Auth(), Allow("seller"));

const healthCtrl = new HealthCheckController();
const authCtrl = new AuthController();
const categoryCtrl = new CategoryController();
const shopCtrl = new ShopController();

// two image fields in one request: logo and cover
const shopImages = Uploader("/shops").fields([
    { name: "logo", maxCount: 1 },
    { name: "cover", maxCount: 1 },
]);

//Healthcheck
router.get("/healthcheck", healthCtrl.handleHealthCheck);

//Auth (the limiter runs first, so spam never reaches the database)
router.post("/auth/register", authLimiter, validateBody(RegistrationSchema), authCtrl.register)
router.post("/auth/login", authLimiter, validateBody(LoginSchema), authCtrl.login)
router.post("/auth/refresh", authLimiter, authCtrl.refresh)
router.get("/auth/me", Auth(), authCtrl.myProfile)
router.post("/auth/logout", authCtrl.logout)

//Public: categories and shops for the website
router.get("/categories/home", categoryCtrl.getCategoryListForHome);
router.get("/shops", shopCtrl.getShopListForHome);
router.get("/shops/:slug", shopCtrl.getShopDetailBySlug);

//Seller: my shop (the upload runs AFTER the login and role check)
sellerRouter.get("/shop", shopCtrl.getMyShop);
sellerRouter.post("/shop", shopImages, validateBody(ShopCreateSchema), shopCtrl.createShop);
sellerRouter.patch("/shop", shopImages, validateBody(ShopUpdateSchema), shopCtrl.updateMyShop);

//Admin: categories
adminRouter.post("/categories", Uploader("/categories").single("image"), validateBody(CategoryCreateSchema), categoryCtrl.createCategory);
adminRouter.get("/categories", categoryCtrl.getAllCategoryData);
adminRouter.get("/categories/:categoryId", categoryCtrl.getCategoryDetail);
adminRouter.put("/categories/:categoryId", Uploader("/categories").single("image"), validateBody(CategoryUpdateSchema), categoryCtrl.updateCategoryDetail);
adminRouter.delete("/categories/:categoryId", categoryCtrl.deleteCategoryDetail);

//Admin: shops
adminRouter.get("/shops", shopCtrl.getAllShopData);
adminRouter.get("/shops/:shopId", shopCtrl.getShopDetail);
adminRouter.patch("/shops/:shopId", validateBody(ShopReviewSchema), shopCtrl.reviewShop);

router.use("/seller", sellerRouter);
router.use("/admin", adminRouter);

export default router;