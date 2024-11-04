import express from "express";
import db from "./prisma-client";
import { SigninSchema, SignupSchema, transactionSchema } from "./zod";
import cors from "cors";
import jwt from "jsonwebtoken";
import { AuthMiddleware } from "./middlewares";
import dotenv from "dotenv"
import bcrypt from "bcrypt"
import axios from "axios";
const app = express();

dotenv.config()
const corsOptions = {
  origin: process.env.CLIENT_URL , 
  credentials: true, 
  methods: ['GET', 'POST','PUT','PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization'], 
};
app.use("*",
  cors(corsOptions)
);
app.use(express.json());
app.get("/api",(req,res)=>{
  return res.status(200).json("hi from deployment");
})
app.get('/api/health', (req, res) => {
   return res.status(200).json('healthy');
});
//forward request to python backend
app.post("/ask-me", async (req, res) => {
  const { question } = req.body;  
  try {
      const { data } = await axios.post("http://127.0.0.1:5000/ask-me", {
          question,
      });
      console.log(data);
      return res.status(200).json({ message: "This is the AI generated response", data });
  } catch (error) {
      console.error("Error in forwarding to Python backend:", error);
      //@ts-ignore
      return res.status(500).json({ message: "Error forwarding request to FastAPI", error: error.message });
  }
});

app.post("/api/signup", async (req, res) => {
  const result = SignupSchema.safeParse(req.body);
  if (!result.success) {
    console.log(result.error);
    return res.json("valid inputs weren't provided");
  }
  try {
    const { name, email, phone, password,pin } = result.data;
    const hashedPassword =await bcrypt.hash(password,10)
    const data = await db.user.create({
      data: {
        email,
        name,
        phone,
        password:hashedPassword,
        pin
      },
    });
    const balance = await db.balance.create({
      data: {
        userId: data.id,
        amount: 10000,
      },
    });
    res
      .status(201)
      .json({ message: "user created succesfully", data, balance });
  } catch (error) {
    console.log(error);
    res.status(500).json("error while creating user.");
  }
});

app.post("/api/signin", async (req, res) => {
  const result = SigninSchema.safeParse(req.body);
  if (!result.success) {
    console.log(result.error);
    return res.json("valid inputs weren't provided");
  }
  try {
    const { phone, password } = result.data;
    const user = await db.user.findUnique({
      where: {
        phone,
      },
    });
    if(!user){
      return
    }
    const passwordMatch =await bcrypt.compare(password,user.password)
    if(!passwordMatch){
      return res.json("password doesn't match")
    }
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );
    
    res.status(200).json({token});
  } catch (error) {
    console.log(error);
    return res.status(400).json("there was an error logging in.")
    
  }
});
app.use(AuthMiddleware);
app.get("/api/personalInfo", async (req, res) => {
  try {
    //@ts-ignore
    const user = req.user;
    if (!user) {
      return res.json("unAuthorized user.");
    }

    const balance = await db.balance.findUnique({
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
  } catch (error) {
    console.log(error);
  }
});

app.get("/api/users/allusers", async (req, res) => {
  try {


    const payload = await db.user.findMany({
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
  } catch (error) {
    console.log(error);
    res.json("unauthorised access.");
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await db.user.findUnique({
      where: {
        id: parseInt(userId),
      },
    });
    if (!user) {
      return res.json("cant find the user");
    }
    const payload = {
      id: user?.id,
      name: user?.name,
      phone: user.phone,
    };
    res
      .status(200)
      .json({ message: "this should go to page with transfer form", payload });
  } catch (error) {}
});

app.get("/api/history", async (req, res) => {
  //@ts-ignore
  const user = req.user;
  try {
    const payload = await db.peerTransfer.findMany({
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
  } catch (error) {
    console.log("error in getting transaction history", error);

    return res.json("error in getting transaction history");
  }
});

app.post("/api/transfer", async (req, res) => {
 //@ts-ignore
  const {id} = req.user
  const result = transactionSchema.safeParse(req.body);
  if (!result.success) {
    console.log("Zod validation errors:", result.error.errors); // Log the validation errors
    return res.status(400).json({
      message: "Invalid request object.",
      errors: result.error.errors,
    });
  }
  try {
    const { receiverId, amount } = result.data;
    const sender = await db.balance.findUnique({
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
    
    const p2p = await db.peerTransfer.create({
      data:{
       senderId: id,
       receiverId: parseInt(receiverId),
       amount: amount,
       status: "Processing",
       timestamp: new Date()
   }
   
   })
 //@ts-ignore
  await db.$transaction(async (tx) => {
    await tx.balance.update({
      where: { userId: id },
      data: { amount: { decrement: amount } },
    });

    await tx.balance.update({
      where: { userId: parseInt(receiverId) },
      data: { amount: { increment: amount } },
    });
    await tx.peerTransfer.update({
      where: {
        id: p2p.id,
      },
      data: {
        status: "Success",
      },
    });
    return res.status(200).json("transaction succesfully completed");
  });
  } catch (error) {
    console.log(error);
  }
});



app.listen(process.env.PORT, () => {
  console.log(`primary backend is listening on port ${process.env.PORT}`);
});
