import { type Request, type Response, type NextFunction } from "express";
import Auth from "./Auth";

// like Auth(), but a visitor who is not logged in is allowed through.
// If the cookie is valid, req.loggedInUser is filled in as usual
export default function OptionalAuth(){
    const auth = Auth();
    return (req: Request, res: Response, next: NextFunction) => {
        // whatever Auth() reports (even an error), we simply continue as a visitor
        auth(req, res, () => next());
    }
}