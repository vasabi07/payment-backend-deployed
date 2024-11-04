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
const express_1 = __importDefault(require("express"));
const prisma_client_1 = __importDefault(require("./prisma-client"));
const zod_1 = require("./zod");
const cors_1 = __importDefault(require("cors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const middlewares_1 = require("./middlewares");
const dotenv_1 = __importDefault(require("dotenv"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const axios_1 = __importDefault(require("axios"));
const app = (0, express_1.default)();
dotenv_1.default.config();
const corsOptions = {
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use("*", (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.get("/api", (req, res) => {
    return res.status(200).json("hi from deployment");
});
app.get('/api/health', (req, res) => {
    return res.status(200).json('healthy');
});
//forward request to python backend
app.post("/ask-me", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question } = req.body;
    try {
        const { data } = yield axios_1.default.post("http://127.0.0.1:5000/ask-me", {
            question,
        });
        console.log(data);
        return res.status(200).json({ message: "This is the AI generated response", data });
    }
    catch (error) {
        console.error("Error in forwarding to Python backend:", error);
        //@ts-ignore
        return res.status(500).json({ message: "Error forwarding request to FastAPI", error: error.message });
    }
}));
app.post("/api/signup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = zod_1.SignupSchema.safeParse(req.body);
    if (!result.success) {
        console.log(result.error);
        return res.json("valid inputs weren't provided");
    }
    try {
        const { name, email, phone, password, pin } = result.data;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const data = yield prisma_client_1.default.user.create({
            data: {
                email,
                name,
                phone,
                password: hashedPassword,
                pin
            },
        });
        const balance = yield prisma_client_1.default.balance.create({
            data: {
                userId: data.id,
                amount: 10000,
            },
        });
        res
            .status(201)
            .json({ message: "user created succesfully", data, balance });
    }
    catch (error) {
        console.log(error);
        res.status(500).json("error while creating user.");
    }
}));
app.post("/api/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = zod_1.SigninSchema.safeParse(req.body);
    if (!result.success) {
        console.log(result.error);
        return res.json("valid inputs weren't provided");
    }
    try {
        const { phone, password } = result.data;
        const user = yield prisma_client_1.default.user.findUnique({
            where: {
                phone,
            },
        });
        if (!user) {
            return;
        }
        const passwordMatch = yield bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.json("password doesn't match");
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        res.status(200).json({ token });
    }
    catch (error) {
        console.log(error);
        return res.status(400).json("there was an error logging in.");
    }
}));
app.use(middlewares_1.AuthMiddleware);
app.get("/api/personalInfo", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //@ts-ignore
        const user = req.user;
        if (!user) {
            return res.json("unAuthorized user.");
        }
        const balance = yield prisma_client_1.default.balance.findUnique({
            where: {
                userId: user.id,
            },
        });
        if (!balance) {
            return;
        }
        const payload = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            balance: balance.amount,
            pin: user.pin
        };
        res.status(200).json({ message: "logged in user's info", payload });
    }
    catch (error) {
        console.log(error);
    }
}));
app.get("/api/users/allusers", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payload = yield prisma_client_1.default.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                Balance: true,
            },
        });
        res.status(200).json({
            message: "here is the list of users available in the db.",
            payload,
        });
    }
    catch (error) {
        console.log(error);
        res.json("unauthorised access.");
    }
}));
app.get("/api/users/:userId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield prisma_client_1.default.user.findUnique({
            where: {
                id: parseInt(userId),
            },
        });
        if (!user) {
            return res.json("cant find the user");
        }
        const payload = {
            id: user === null || user === void 0 ? void 0 : user.id,
            name: user === null || user === void 0 ? void 0 : user.name,
            phone: user.phone,
        };
        res
            .status(200)
            .json({ message: "this should go to page with transfer form", payload });
    }
    catch (error) { }
}));
app.get("/api/history", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const user = req.user;
    try {
        const payload = yield prisma_client_1.default.peerTransfer.findMany({
            where: {
                OR: [
                    {
                        senderId: user.id,
                    },
                    {
                        receiverId: user.id,
                    },
                ],
            },
        });
        return res.json({ message: "transaction history", payload });
    }
    catch (error) {
        console.log("error in getting transaction history", error);
        return res.json("error in getting transaction history");
    }
}));
app.post("/api/transfer", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const { id } = req.user;
    const result = zod_1.transactionSchema.safeParse(req.body);
    if (!result.success) {
        console.log("Zod validation errors:", result.error.errors); // Log the validation errors
        return res.status(400).json({
            message: "Invalid request object.",
            errors: result.error.errors,
        });
    }
    try {
        const { receiverId, amount } = result.data;
        const sender = yield prisma_client_1.default.balance.findUnique({
            where: {
                userId: id,
            },
        });
        if (!sender) {
            return res.json("invalid senderId.");
        }
        if (amount > sender.amount) {
            return res.json("in-suffiecient balance.");
        }
        const p2p = yield prisma_client_1.default.peerTransfer.create({
            data: {
                senderId: id,
                receiverId: parseInt(receiverId),
                amount: amount,
                status: "Processing",
                timestamp: new Date()
            }
        });
        //@ts-ignore
        yield prisma_client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.balance.update({
                where: { userId: id },
                data: { amount: { decrement: amount } },
            });
            yield tx.balance.update({
                where: { userId: parseInt(receiverId) },
                data: { amount: { increment: amount } },
            });
            yield tx.peerTransfer.update({
                where: {
                    id: p2p.id,
                },
                data: {
                    status: "Success",
                },
            });
            return res.status(200).json("transaction succesfully completed");
        }));
    }
    catch (error) {
        console.log(error);
    }
}));
app.listen(process.env.PORT, () => {
    console.log(`primary backend is listening on port ${process.env.PORT}`);
});
