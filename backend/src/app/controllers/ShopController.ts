import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import ShopModel from "../model/ShopModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { mapImage, removeImage, removeUploadedFiles } from "../../utilities/helper";
import { escapeRegex, getPagination } from "../../utilities/query";

// what multer gives us when the route uses upload.fields(...)
type ShopFiles = Record<string, Express.Multer.File[]> | undefined;

// fields that visitors must never see
const PUBLIC_HIDDEN = { owner: 0, businessRegNo: 0, rejectionReason: 0, reviewedBy: 0, __v: 0 };

// only these sort options are allowed, so users cannot sort by any field they like
const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
    newest: { createdAt: -1 },
    popular: { followerCount: -1, createdAt: -1 },
    rating: { ratingAvg: -1, ratingCount: -1 },
};

const makeSlug = (name: string) => slugify(name, { lower: true, trim: true, strict: true });

export default class ShopController{
    // ====================== SELLER ======================

    /**
     * @description Seller: create my shop (status starts as pending)
     */
    async createShop(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const owner = new mongoose.Types.ObjectId(user._id);

            if(await ShopModel.exists({ owner: owner })){
                throw new ApiError("You already have a shop", 409)
            }

            const { name, description, phone, email, address, businessRegNo } = req.body;

            // "Urban Threads" and "urban threads" would make the same slug, so check before saving
            const slug = makeSlug(name);
            if(!slug){
                throw new ApiError("Validation Failed", 400, { name: "Shop name must contain letters or numbers" })
            }
            if(await ShopModel.exists({ slug: slug })){
                throw new ApiError("Validation Failed", 400, { name: "Shop name is already taken" })
            }

            const files = req.files as ShopFiles;
            const shop = new ShopModel({
                owner, name, slug, description, businessRegNo,
                contact: { phone, email, address },
            });
            if(files?.logo?.[0]){
                shop.logo = mapImage(files.logo[0], "/shops/")
            }
            if(files?.cover?.[0]){
                shop.cover = mapImage(files.cover[0], "/shops/")
            }
            await shop.save()

            res.status(201).json({
                result: shop,
                message: "Shop created. It will be visible after admin approval.",
            })
        }catch(exception){
            await removeUploadedFiles(req)
            next(exception)
        }
    }

    /**
     * @description Seller: see my own shop (including its status and the rejection reason)
     */
    async getMyShop(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findOne({ owner: user._id }).lean();
            if(!shop){
                throw new ApiError("You have not created a shop yet", 404)
            }
            res.json({
                result: shop,
                message: "My Shop",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Seller: edit my shop. A rejected shop goes back to pending (resubmitted for review).
     * The slug never changes, so existing links keep working.
     */
    async updateMyShop(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findOne({ owner: user._id });
            if(!shop){
                throw new ApiError("You have not created a shop yet", 404)
            }
            if(shop.status === "suspended"){
                throw new ApiError("Your shop is suspended. Please contact support.", 403)
            }

            const { name, description, phone, email, address, businessRegNo } = req.body;

            if(name !== undefined && name !== shop.name){
                const newSlug = makeSlug(name);
                if(!newSlug){
                    throw new ApiError("Validation Failed", 400, { name: "Shop name must contain letters or numbers" })
                }
                // taken by ANOTHER shop?
                if(await ShopModel.exists({ slug: newSlug, _id: { $ne: shop._id } })){
                    throw new ApiError("Validation Failed", 400, { name: "Shop name is already taken" })
                }
                shop.name = name;
            }
            if(description !== undefined){
                shop.description = description;
            }
            if(phone !== undefined){
                shop.set("contact.phone", phone);
            }
            if(email !== undefined){
                shop.set("contact.email", email);
            }
            if(address !== undefined){
                shop.set("contact.address", address);
            }
            if(businessRegNo !== undefined){
                shop.businessRegNo = businessRegNo;
            }

            const files = req.files as ShopFiles;
            const oldLogoPath = shop.logo?.path;
            const oldCoverPath = shop.cover?.path;
            if(files?.logo?.[0]){
                shop.logo = mapImage(files.logo[0], "/shops/")
            }
            if(files?.cover?.[0]){
                shop.cover = mapImage(files.cover[0], "/shops/")
            }

            // editing a rejected shop means the seller fixed the problem: send it back for review
            if(shop.status === "rejected"){
                shop.status = "pending";
                shop.rejectionReason = null;
            }

            await shop.save()

            // old pictures are deleted only after the update worked
            if(files?.logo?.[0]){
                await removeImage(oldLogoPath)
            }
            if(files?.cover?.[0]){
                await removeImage(oldCoverPath)
            }

            res.json({
                result: shop,
                message: "Shop Updated",
            })
        }catch(exception){
            await removeUploadedFiles(req)
            next(exception)
        }
    }

    // ====================== ADMIN ======================

    /**
     * @description Admin: list all shops (pending first is easy with ?status=pending)
     */
    async getAllShopData(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};

            if(req.query.search){
                filter.name = new RegExp(escapeRegex(String(req.query.search)), "i");
            }
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);

            const [rows, count] = await Promise.all([
                ShopModel.find(filter, {}, {
                    sort: { createdAt: "desc" },
                    skip: skip,
                    limit: limit,
                })
                    .populate("owner", "fullName username phone")
                    .lean(),
                ShopModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Shop List",
                pagination: {
                    page: page,
                    count: count,
                    limit: limit,
                    totalPages: Math.ceil(count / limit),
                },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: one shop with its owner
     */
    async getShopDetail(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await ShopModel.findById(req.params.shopId as string)
                .populate("owner", "fullName username phone")
                .lean();
            if(!shop){
                throw new ApiError("Shop not found", 404)
            }
            res.json({
                result: shop,
                message: "Shop detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: approve, reject or suspend a shop, and mark it verified or featured
     */
    async reviewShop(req: Request, res: Response, next: NextFunction){
        try{
            const admin = req.loggedInUser as IUserDetail;
            const shop = await ShopModel.findById(req.params.shopId as string);
            if(!shop){
                throw new ApiError("Shop not found", 404)
            }

            const { status, rejectionReason, isVerified, isFeatured } = req.body;

            if(status !== undefined){
                shop.status = status;
                shop.rejectionReason = status === "rejected" ? rejectionReason : null;
                shop.reviewedBy = new mongoose.Types.ObjectId(admin._id);
                if(status === "approved" && !shop.approvedAt){
                    shop.approvedAt = new Date();
                }
                // a shop that is not approved cannot stay featured
                if(status !== "approved"){
                    shop.isFeatured = false;
                }
            }
            if(isVerified !== undefined){
                shop.isVerified = isVerified;
            }
            if(isFeatured !== undefined){
                shop.isFeatured = isFeatured;
            }

            // business rule: only an approved shop can be MARKED as featured or verified.
            // We check what the admin is asking for, not what is already saved,
            // so suspending a verified shop still works.
            if((isFeatured === true || isVerified === true) && shop.status !== "approved"){
                throw new ApiError("Validation Failed", 400, {
                    status: "Only an approved shop can be featured or verified",
                })
            }

            await shop.save()

            res.json({
                result: shop,
                message: "Shop Reviewed",
            })
        }catch(exception){
            next(exception)
        }
    }

    // ====================== PUBLIC ======================

    /**
     * @description Public: approved shops. ?featured=true  ?verified=true  ?search=  ?sort=newest|popular|rating
     */
    async getShopListForHome(req: Request, res: Response, next: NextFunction){
        try{
            // visitors may only ever see approved shops
            const filter: Record<string, unknown> = { status: "approved" };

            if(req.query.featured === "true"){
                filter.isFeatured = true;
            }
            if(req.query.verified === "true"){
                filter.isVerified = true;
            }
            if(req.query.search){
                filter.name = new RegExp(escapeRegex(String(req.query.search)), "i");
            }

            const sort = SORT_OPTIONS[String(req.query.sort)] ?? SORT_OPTIONS.newest;
            const { page, limit, skip } = getPagination(req, 12, 50);

            const [rows, count] = await Promise.all([
                ShopModel.find(filter, PUBLIC_HIDDEN, {
                    sort: sort,
                    skip: skip,
                    limit: limit,
                }).lean(),
                ShopModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Shop List",
                pagination: {
                    page: page,
                    count: count,
                    limit: limit,
                    totalPages: Math.ceil(count / limit),
                },
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Public: one approved shop by its slug
     */
    async getShopDetailBySlug(req: Request, res: Response, next: NextFunction){
        try{
            const shop = await ShopModel.findOne(
                { slug: req.params.slug as string, status: "approved" },
                PUBLIC_HIDDEN
            ).lean();
            if(!shop){
                throw new ApiError("Shop not found", 404)
            }
            res.json({
                result: shop,
                message: "Shop detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }
}