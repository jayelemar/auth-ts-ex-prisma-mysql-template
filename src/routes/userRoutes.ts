import { Router } from "express";
import { protect } from "../middlewares/authMiddleware";
import { 
  changePassword,
  forgotPassword,
  getUser, 
  loginStatus, 
  loginUser, 
  logoutUser, 
  registerUser,
  resetPassword,
  updateUser
} from "../controllers/userControllers";


const userRoutes:Router = Router()

userRoutes.post('/register', registerUser)
userRoutes.post('/login', loginUser)
userRoutes.get('/logout', logoutUser)
userRoutes.get('/getuser', protect, getUser)
userRoutes.get('/loggedin', loginStatus)
userRoutes.patch('/updateuser', protect, updateUser)
userRoutes.patch('/changepassword', protect, changePassword)
userRoutes.post('/forgotpassword', forgotPassword)   
userRoutes.put('/resetpassword/:resetToken', resetPassword)   

export default userRoutes