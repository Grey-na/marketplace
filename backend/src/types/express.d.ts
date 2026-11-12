import { IUserDetail } from "./User";

declare global {
    namespace Express {
        interface Request {
            loggedInUser?: IUserDetail;
        }
    }
}