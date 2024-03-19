import dotenv from 'dotenv'

dotenv.config({path:'.env'})

export const PORT = process.env.PORT
export const NODE_ENV = process.env.NODE_ENV
export const JWT_SECRET = process.env.JWT_SECRET!
export const EMAIL_HOST = process.env.EMAIL_HOST
export const EMAIL_USER = process.env.EMAIL_USER!
export const EMAIL_PASS= process.env.EMAIL_PASS
export const FRONTEND_URL= process.env.FRONTEND_URL


