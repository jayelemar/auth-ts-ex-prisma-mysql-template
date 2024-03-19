import { Router } from "express";
import userRoutes from "./userRoutes";

const rootRouter:Router = Router()

rootRouter.use('/users', userRoutes)

export default rootRouter;