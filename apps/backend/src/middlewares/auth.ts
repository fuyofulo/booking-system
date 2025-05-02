import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from "@repo/secrets/config";

if(!JWT_SECRET) {
    throw new Error("JWT_SECRET couldnt be exported from the backend-common/config");
} 

export function authMiddleware(req: Request, res: Response, next: NextFunction) {

    const token = req.headers["authorization"] || "";

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            //@ts-ignore
            req.userId = decoded.userId;
            next();
        }
    } catch (err) {
        res.status(401).json({ message: "Invalid or missing token" });
    }
    
}