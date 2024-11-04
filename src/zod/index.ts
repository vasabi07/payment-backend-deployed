import {z} from "zod"
export const SignupSchema = z.object({
    name: z.string().optional(),
    phone: z.string().length(10),
    email: z.string().email().optional(),
    password: z.string().min(6),
    pin: z.string().length(4)
})

export const SigninSchema = z.object({
    phone: z.string().length(10),
    password: z.string().min(6)
})

export const transactionSchema = z.object({
    receiverId: z.string(), // Keep as string or convert it in your logic
    amount: z.number().positive() // Ensure it’s a positive number
});
