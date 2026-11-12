export type UserRole = "admin" | "customer" | "seller";
export type UserStatus = "active" | "suspended";

// the small, safe version of a user that we attach to every logged in request
export interface IUserDetail {
    _id: string;
    fullName: string;
    username: string;
    role: UserRole;
    phone: string;
    status: UserStatus;
}