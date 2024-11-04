"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_client_1 = __importDefault(require("../prisma-client"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const AuthMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const AuthHeader = req.headers.authorization;
    if (!AuthHeader) {
        return res.status(401).json("No Auth header provided");
    }
    const token = AuthHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json("Unauthorized: Invalid token");
        }
        const user = yield prisma_client_1.default.user.findUnique({
            where: {
                //@ts-ignore
                id: decoded.userId,
            },
        });
        if (!user) {
            return res.status(404).json("User doesn't exist");
        }
        //@ts-ignore
        req.user = user;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json("Token expired");
        }
        return res.status(401).json("Unauthorized: Invalid token");
    }
});
exports.AuthMiddleware = AuthMiddleware;
