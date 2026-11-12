import { type Request, type Response, type NextFunction } from "express";
import mongoose from "mongoose";
import slugify from "slugify";
import CategoryModel from "../model/CategoryModel";
import ApiError from "../errors/ApiError";
import { type IUserDetail } from "../../types/User";
import { mapImage, removeImage, removeUploadedFiles } from "../../utilities/helper";
import { escapeRegex, getPagination } from "../../utilities/query";

export default class CategoryController{
    /**
     * @description Admin: create a category with an optional image
     */
    async createCategory(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const { title, status, color } = req.body;

            const slug = slugify(title, { lower: true, trim: true, strict: true });

            // "Shoes" and "shoes" would make the same slug, so check before saving
            const exists = await CategoryModel.findOne({ slug: slug });
            if(exists){
                throw new ApiError("Validation Failed", 400, { title: "Category already exists" })
            }

            const category = new CategoryModel({
                title, status, color, slug,
                createdBy: new mongoose.Types.ObjectId(user._id),
            });
            if(req.file){
                category.image = mapImage(req.file, "/categories/")
            }
            await category.save()

            res.status(201).json({
                result: category,
                message: "Category Created Successfully",
            })
        }catch(exception){
            // the file was already saved by multer, so remove it when the category could not be created
            await removeUploadedFiles(req)
            next(exception)
        }
    }

    /**
     * @description Admin: list all categories with search, status filter and pagination
     */
    async getAllCategoryData(req: Request, res: Response, next: NextFunction){
        try{
            const filter: Record<string, unknown> = {};

            if(req.query.search){
                filter.title = new RegExp(escapeRegex(String(req.query.search)), "i");
            }
            if(req.query.status){
                filter.status = String(req.query.status).toLowerCase();
            }

            const { page, limit, skip } = getPagination(req, 20, 100);

            // two questions for the database, asked at the same time
            const [rows, count] = await Promise.all([
                CategoryModel.find(filter, {}, {
                    sort: { createdAt: "desc" },
                    skip: skip,
                    limit: limit,
                }).lean(),
                CategoryModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Category List",
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
     * @description Admin: one category by id
     */
    async getCategoryDetail(req: Request, res: Response, next: NextFunction){
        try{
            // an invalid id throws a CastError, which ErrorHandler turns into a 400
            const category = await CategoryModel.findById(req.params.categoryId as string).lean();
            if(!category){
                throw new ApiError("Category not found", 404)
            }
            res.json({
                result: category,
                message: "Category detail fetched",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Admin: update a category. Only the fields that are sent are changed.
     * The slug stays the same even if the title changes, so old links keep working.
     */
    async updateCategoryDetail(req: Request, res: Response, next: NextFunction){
        try{
            const user = req.loggedInUser as IUserDetail;
            const category = await CategoryModel.findById(req.params.categoryId as string);
            if(!category){
                throw new ApiError("Category not found", 404)
            }

            const oldImagePath = category.image?.path;
            const { title, status, color } = req.body;

            if(title !== undefined){
                category.title = title;
            }
            if(status !== undefined){
                category.status = status;
            }
            if(color !== undefined){
                category.color = color;
            }
            if(req.file){
                category.image = mapImage(req.file, "/categories/")
            }
            category.updatedBy = new mongoose.Types.ObjectId(user._id);

            await category.save()

            // the old picture is deleted only after the update worked
            if(req.file){
                await removeImage(oldImagePath)
            }

            res.json({
                result: category,
                message: "Category Updated",
            })
        }catch(exception){
            await removeUploadedFiles(req)
            next(exception)
        }
    }

    /**
     * @description Admin: delete a category and its image
     */
    async deleteCategoryDetail(req: Request, res: Response, next: NextFunction){
        try{
            // TODO (Step 5): refuse to delete a category that still has products
            const category = await CategoryModel.findByIdAndDelete(req.params.categoryId as string);
            if(!category){
                throw new ApiError("Category not found", 404)
            }
            await removeImage(category.image?.path)

            res.json({
                result: category,
                message: "Category Deleted",
            })
        }catch(exception){
            next(exception)
        }
    }

    /**
     * @description Public: active categories for the homepage and the navigation
     */
    async getCategoryListForHome(req: Request, res: Response, next: NextFunction){
        try{
            // visitors may only ever see active categories
            const filter: Record<string, unknown> = { status: "active" };

            if(req.query.search){
                filter.title = new RegExp(escapeRegex(String(req.query.search)), "i");
            }

            const { page, limit, skip } = getPagination(req, 12, 50);

            const [rows, count] = await Promise.all([
                CategoryModel.find(filter, { createdBy: 0, updatedBy: 0, __v: 0 }, {
                    sort: { title: "asc" },
                    skip: skip,
                    limit: limit,
                }).lean(),
                CategoryModel.countDocuments(filter),
            ]);

            res.json({
                result: rows,
                message: "Category List",
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
}