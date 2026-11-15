import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import ProductModel from "../model/ProductModel";
import ShopModel from "../model/ShopModel";
import CategoryModel from "../model/CategoryModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { MAX_IMAGES, MIN_PRICE_PAISA } from "../../types/Product";
import { type ProductCreateInput, type ProductUpdateInput } from "../request/ProductRequest";
import { mapImage, removeImage, removeUploadedFiles } from "../../utilities/helper";
import { escapeRegex, getPagination, isObjectId } from "../../utilities/query";

// fields that visitors must never see
const PUBLIC_HIDDEN = { createdBy: 0, updatedBy: 0, isBlocked: 0, blockReason: 0, __v: 0 };

// only these sort options are allowed. _id is the last key so equal values still have a fixed order
const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1, _id: -1 },
    price_asc: { afterDiscount: 1, _id: 1 },
    price_desc: { afterDiscount: -1, _id: -1 },
    popular: { "stats.sold": -1, "stats.views": -1, _id: -1 },
    rating: { "stats.ratingAvg": -1, "stats.ratingCount": -1, _id: -1 },
};

// ---------- small helpers ----------

const makeProductSlug = (title: string) => {
    const base = slugify(title, { lower: true, trim: true, strict: true }) || "product";
    return `${base}-${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * @description The shop of the logged in seller. Stops the request if there is no shop,
 * the shop is suspended, or (when required) the shop is not approved yet
 */
const getSellerShop = async (req: Request, mustBeApproved: boolean) => {
    const user = req.loggedInUser as IUserDetail;
    const shop = await ShopModel.findOne({ owner: user._id });
    if(!shop){
        throw new ApiError("Create your shop first", 403)
    }
    if(shop.status === "suspended"){
        throw new ApiError("Your shop is suspended", 403)
    }
    if(mustBeApproved && shop.status !== "approved"){
        throw new ApiError("Your shop must be approved before you can add products", 403)
    }
    return shop;
}

/**
 * @description One of MY products. A product of another shop gives 404, so nobody can find out it exists
 */
const findOwnProduct = async (req: Request, shopId: mongoose.Types.ObjectId) => {
    const product = await ProductModel.findOne({ _id: req.params.productId as string, shop: shopId });
    if(!product){
        throw new ApiError("Product not found", 404)
    }
    return product;
}

const assertCategory = async (categoryId: string) => {
    const exists = await CategoryModel.exists({ _id: categoryId, status: "active" });
    if(!exists){
        throw new ApiError("Validation Failed", 400, { category: "Category not found" })
    }
}

// the price after discount must not fall below the minimum price
const assertPriceRule = (price: number, discount: number) => {
    const afterDiscount = Math.round(price - (price * discount) / 100);
    if(afterDiscount < MIN_PRICE_PAISA){
        throw new ApiError("Validation Failed", 400, {
            discount: `Price after discount cannot be below ${MIN_PRICE_PAISA} paisa (Rs. ${MIN_PRICE_PAISA / 100})`,
        })
    }
}

/**
 * @description The base rule for what visitors can see: active, not blocked, and the shop is approved
 */
export const getVisibleBase = async () => {
    const approvedShopIds = await ShopModel.distinct("_id", { status: "approved" });
    const filter: Record<string, unknown> = {
        status: "active",
        isBlocked: false,
        shop: { $in: approvedShopIds },
    };
    return filter;
}

// ---------- public list ----------

const fetchPublicProducts = async (req: Request) => {
    const filter = await getVisibleBase();

    // ?shop=<shop slug>  an unknown slug gives an empty result
    if(req.query.shop){
        const shop = await ShopModel.findOne({ slug: String(req.query.shop), status: "approved" }, { _id: 1 }).lean();
        filter.shop = shop ? shop._id : { $in: [] };
    }
    // ?category=<category slug>
    if(req.query.category){
        const category = await CategoryModel.findOne({ slug: String(req.query.category), status: "active" }, { _id: 1 }).lean();
        filter.category = category ? category._id : { $in: [] };
    }
    if(req.query.search){
        filter.$text = { $search: String(req.query.search) };
    }
    if(req.query.brand){
        filter.brand = new RegExp(escapeRegex(String(req.query.brand)), "i");
    }
    if(req.query.tag){
        filter.tags = String(req.query.tag).toLowerCase();
    }
    if(req.query.inStock === "true"){
        filter.stock = { $gt: 0 };
    }
    if(req.query.featured === "true"){
        filter.isFeatured = true;
    }

    // price range in paisa
    const range: Record<string, number> = {};
    if(req.query.minPrice !== undefined && !isNaN(Number(req.query.minPrice))){
        range.$gte = Number(req.query.minPrice);
    }
    if(req.query.maxPrice !== undefined && !isNaN(Number(req.query.maxPrice))){
        range.$lte = Number(req.query.maxPrice);
    }
    if(Object.keys(range).length > 0){
        filter.afterDiscount = range;
    }

    const sort = SORT_OPTIONS[String(req.query.sort)] ?? SORT_OPTIONS.newest;
    const { page, limit, skip } = getPagination(req, 12, 50);

    const [rows, count] = await Promise.all([
        ProductModel.find(filter, PUBLIC_HIDDEN, { sort: sort, skip: skip, limit: limit })
            .populate("category", "_id title slug color")
            .populate("shop", "_id name slug logo isVerified")
            .lean(),
        ProductModel.countDocuments(filter),
    ]);

    return { rows, count, page, limit };
}

export default class ProductController{
    // ====================== SELLER ======================

    /**
     * @description Seller: create a product. It starts inactive, until it has at least one image
     */
    async createProduct(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await getSellerShop(req, true);
            const data = req.body as ProductCreateInput;

            assertPriceRule(data.price, data.discount);
            await assertCategory(data.category);

            const product = new ProductModel({
                ...data,
                shop: shop._id,
                slug: makeProductSlug(data.title),
                createdBy: new mongoose.Types.ObjectId(user._id),
            });
            await product.save()

            res.status(201).json({
                result: product,
                message: "Product created as a draft. Upload at least one image, then set its status to active.",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: my products (all statuses)
     */
    async getMyProducts(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await getSellerShop(req, false);
            const filter: Record<string, unknown> = { shop: shop._id };

            if(req.query.search){
                filter.title = new RegExp(escapeRegex(String(req.query.search)), "i");
            }
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [rows, count] = await Promise.all([
                ProductModel.find(filter, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("category", "_id title slug color")
                    .lean(),
                ProductModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "My Products",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: one of my products
     */
    async getMyProductDetail(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await getSellerShop(req, false);
            const product = await findOwnProduct(req, shop._id);
            res.json({
                result: product,
                message: "Product detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: edit a product. The slug never changes, so links keep working
     */
    async updateMyProduct(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await getSellerShop(req, false);
            const product = await findOwnProduct(req, shop._id);
            const data = req.body as ProductUpdateInput;

            if(data.category){
                await assertCategory(data.category);
            }

            // safe: Zod already removed every field we did not whitelist (isBlocked, shop, stats ...)
            product.set(data);
            product.updatedBy = new mongoose.Types.ObjectId(user._id);

            // check the final values, not only the ones in the request
            assertPriceRule(product.price, product.discount);
            if(product.status === "active"){
                if(product.images.length === 0){
                    throw new ApiError("Validation Failed", 400, { status: "Upload at least one image before activating the product" })
                }
                if(shop.status !== "approved"){
                    throw new ApiError("Your shop must be approved first", 403)
                }
            }

            await product.save()
            res.json({
                result: product,
                message: "Product Updated",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: add pictures (up to MAX_IMAGES in total)
     */
    async addProductImages(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await getSellerShop(req, false);
            const product = await findOwnProduct(req, shop._id);

            const files = Array.isArray(req.files) ? req.files : [];
            if(files.length === 0){
                throw new ApiError("Validation Failed", 400, { images: "Please choose at least one image" })
            }
            if(product.images.length + files.length > MAX_IMAGES){
                throw new ApiError("Validation Failed", 400, { images: `A product can have at most ${MAX_IMAGES} images` })
            }

            files.forEach((file) => {
                product.images.push(mapImage(file, "/products/"))
            })
            await product.save()

            res.json({
                result: product,
                message: "Images added",
            })
        }catch(exception){
            // multer saved the files before we could check, so remove them
            await removeUploadedFiles(req)
            next(exception)
        }
    }

    /**
     * @description Seller: remove one picture (the file name is in the product's images list)
     */
    async deleteProductImage(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await getSellerShop(req, false);
            const product = await findOwnProduct(req, shop._id);
            const filename = req.params.filename as string;

            const image = product.images.find((img) => img.filename === filename);
            if(!image){
                throw new ApiError("Image not found", 404)
            }
            if(product.status === "active" && product.images.length === 1){
                throw new ApiError("Validation Failed", 400, { images: "An active product needs at least one image. Set it to inactive first." })
            }

            product.set("images", product.images.filter((img) => img.filename !== filename));
            await product.save()
            await removeImage(image.path)

            res.json({
                result: product,
                message: "Image removed",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: delete a product and its pictures
     */
    async deleteMyProduct(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await getSellerShop(req, false);
            const product = await findOwnProduct(req, shop._id);

            await product.deleteOne()
            await Promise.all(product.images.map((img) => removeImage(img.path)))

            res.json({
                result: product,
                message: "Product Deleted",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== ADMIN ======================

    /**
     * @description Admin: all products, any status
     */
    async getAllProductsForAdmin(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};

            if(req.query.search){
                filter.title = new RegExp(escapeRegex(String(req.query.search)), "i");
            }
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }
            if(req.query.blocked === "true"){
                filter.isBlocked = true;
            }
            if(req.query.shop){
                const shopId = String(req.query.shop);
                if(!isObjectId(shopId)){
                    throw new ApiError("Validation Failed", 400, { shop: "Invalid shop id" })
                }
                filter.shop = shopId;
            }

            const { page, limit, skip } = getPagination(req, 20, 100);
            const [rows, count] = await Promise.all([
                ProductModel.find(filter, {}, { sort: { createdAt: -1, _id: -1 }, skip: skip, limit: limit })
                    .populate("category", "_id title slug")
                    .populate("shop", "_id name slug status")
                    .lean(),
                ProductModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Product List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: one product
     */
    async getProductDetailForAdmin(req: Request, res: Response, next: NextFunction){
        try{
            const product = await ProductModel.findById(req.params.productId as string)
                .populate("category", "_id title slug")
                .populate("shop", "_id name slug status")
                .lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }
            res.json({
                result: product,
                message: "Product detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: block or unblock a product, and feature it
     */
    async reviewProduct(req: Request, res: Response, next: NextFunction){
        try{
            const product = await ProductModel.findById(req.params.productId as string);
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            const { isBlocked, blockReason, isFeatured } = req.body;

            if(isBlocked !== undefined){
                product.isBlocked = isBlocked;
                product.blockReason = isBlocked ? blockReason : null;
                if(isBlocked){
                    product.isFeatured = false;
                }
            }
            if(isFeatured !== undefined){
                product.isFeatured = isFeatured;
            }

            // only a product that visitors can see may be featured
            if(isFeatured === true && (product.isBlocked || product.status !== "active")){
                throw new ApiError("Validation Failed", 400, { isFeatured: "Only an active, unblocked product can be featured" })
            }

            await product.save()
            res.json({
                result: product,
                message: "Product Reviewed",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== PUBLIC ======================

    /**
     * @description Public: products. ?search= ?category=<slug> ?shop=<slug> ?brand= ?tag= ?inStock=true ?featured=true
     * ?minPrice= ?maxPrice= (paisa) ?sort=newest|price_asc|price_desc|popular|rating ?page= ?limit=
     */
    async getProductListForHome(req: Request, res: Response, next: NextFunction){
        try{
            const { rows, count, page, limit } = await fetchPublicProducts(req);
            res.json({
                result: rows,
                message: "Product List",
                pagination: { page: page, count: count, limit: limit, totalPages: Math.ceil(count / limit) },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Public: one product by its slug
     */
    async getProductDetailBySlug(req: Request, res: Response, next: NextFunction){
        try{
            const filter = await getVisibleBase();
            filter.slug = req.params.slug as string;

            const product = await ProductModel.findOne(filter, PUBLIC_HIDDEN)
                .populate("category", "_id title slug color")
                .populate("shop", "_id name slug logo isVerified ratingAvg ratingCount followerCount")
                .lean();
            if(!product){
                throw new ApiError("Product not found", 404)
            }

            res.json({
                result: product,
                message: "Product detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }
}