import { Roles } from "./users.types";

declare global {
    namespace Express {
        interface Request {
            userId?: number;
            userRole?: Roles;
        }
    }
}