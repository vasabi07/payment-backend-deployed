"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionSchema = exports.SigninSchema = exports.SignupSchema = void 0;
const zod_1 = require("zod");
exports.SignupSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().length(10),
    email: zod_1.z.string().email().optional(),
    password: zod_1.z.string().min(6),
    pin: zod_1.z.string().length(4)
});
exports.SigninSchema = zod_1.z.object({
    phone: zod_1.z.string().length(10),
    password: zod_1.z.string().min(6)
});
exports.transactionSchema = zod_1.z.object({
    receiverId: zod_1.z.string(), // Keep as string or convert it in your logic
    amount: zod_1.z.number().positive() // Ensure it’s a positive number
});
