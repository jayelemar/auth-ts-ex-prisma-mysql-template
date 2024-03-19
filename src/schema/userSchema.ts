import { z } from 'zod'

export const RegisterUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters"})
})

export const LoginUserSchema = z.object({
  email: z.string().email(),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters"})
})
