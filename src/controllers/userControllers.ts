import {Response, Request} from 'express'
import asyncHandler from 'express-async-handler'
import { LoginUserSchema, RegisterUserSchema } from '../schema/userSchema';
import { prismaClient } from '..';
import { compareSync, hashSync } from 'bcrypt'
import { generateToken, sendHttpOnlyCookie } from '../utils/authUtils';

import { EMAIL_USER, FRONTEND_URL, JWT_SECRET } from '../secrets';
import jwt from 'jsonwebtoken'
import { AuthenticatedRequest } from '../types/authTypes';
import crypto from 'crypto'
import { sendEmail } from '../utils/sendEmail';

export const registerUser = asyncHandler(async ( req:Request, res:Response ) => {
  // Validation
  RegisterUserSchema.parse(req.body)

  const { name, email, password } = req.body

  //check email if already exist in DB
  const userExist = await prismaClient.user.findFirst({
    where: { email }
  })
  if (userExist) {
    res.status(400)
    throw new Error("Email has already been registered.")
  }
  
  //create user
  const user = await prismaClient.user.create({
    data: {
      name,
      email,
      password: hashSync(password, 10)
    }
  })

  //Generate Token
  const token = generateToken(user.id)

  //Send HTTP-only cookie
  sendHttpOnlyCookie(res, token)

  if(user) {
    const { id, name, email } = user
    res.status(201).json({
      id,
      email,
      name,
      token,
    })
  } else {
    res.status(400)
    throw new Error("Invalid user data.")
  }
});

export const loginUser = asyncHandler(async ( req:Request, res:Response ) => {
  //Validation
  LoginUserSchema.parse(req.body)
  const { email, password } = req.body

  // Check if user email already exist
  let user = await prismaClient.user.findFirst({
    where: {email}
  })
  if (!user) {
    res.status(400);
    throw new Error("User not found, please signup")
  }
  const passwordIsCorrect = await compareSync(password, user.password)
  if(!passwordIsCorrect) {
    throw new Error("Incorrect password, please try again.")
  }

  //Generate token
  const token = generateToken(user.id)

  //Send HTTP-only cookie
  sendHttpOnlyCookie(res, token)

  // Send Json Response
  if(user) {
    const { id, name, email } = user
    res.status(200).json({
      id, name, email, token
    })
  } else {
    res.status(400)
    throw new Error("Invalid user data.")
  }
});

export const logoutUser = asyncHandler(async ( req:Request, res:Response ) => {
  // Expire the cookie to logout
  res.cookie("token", "", {
    path: "/",
    httpOnly: true,
    expires: new Date(0), // expire now
    sameSite: "none",
    secure: true,
  })

  //Send Json Response
  res.status(200).json({ message: "User Logout Successfully"})
});

export const getUser = asyncHandler(async ( req:AuthenticatedRequest, res:Response ) => {
  const userId = req.user.id
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { 
      id:true, 
      name:true,
      email:true,
    }
  })
  if(!user){
    res.status(400)
    throw new Error("User not found.")
  }
  res.status(200).json(user)
});

export const loginStatus = asyncHandler(async ( req:Request, res:Response ) => {
  //Get Token
  const token = req.cookies.token
  if(!token) {
    res.json(false)
  }
   // Verify token
  const verified = jwt.verify(token, JWT_SECRET) as { id: string };
  if(verified) {
    res.json(true)
  } else {
    res.json(false)
  }
});

export const updateUser = asyncHandler(async ( req:AuthenticatedRequest, res:Response ) => {
  //Get Request ID
  const userId = req.user.id;

    // check if user exist in DB
  const existingUser = await prismaClient.user.findUnique({
    where: { id: userId }
  })
  if (!existingUser) {
    res.status(404)
    throw new Error("User not found.")
  }

  //Extract existing user details
  const { name, email } = existingUser

  // Update user fields with the request body data
  const updatedUser = await prismaClient.user.update({
    where: { id: userId },
    data: { 
      email: req.body.email || email,
      name: req.body.name || name,
    }
  })

  //Send response json
  res.status(200).json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email
  })
});

export const changePassword = asyncHandler(async ( req:AuthenticatedRequest, res:Response ) => {
  //Get Request body 
  const {oldPassword, newPassword} = req.body
  const userId = req.user.id

  //Get user data from DB
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
  })
  if(!user) {
    res.status(400)
    throw new Error("User not found, please signup.")
  }

  //Validation
  if(!oldPassword || !newPassword) {
    res.status(400)
    throw new Error("Please add old and new password")
  }

  //Check old password matches user password in DB
  const passwordIsCorrect = await compareSync(oldPassword, user.password)
  if(passwordIsCorrect){
    //Hash new password
    const hashedPassword = hashSync(newPassword, 10)

    //Save the hash new password in the DB
    await prismaClient.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    //Send Json Response
    res.status(200).send("Password changed successfully.")
  } else {
    res.status(400)
    throw new Error("Old password is incorrect.")
  }
});

export const forgotPassword = asyncHandler(async ( req:Request, res:Response ) => {
  // Get Request Body
  const { email } = req.body

  //Check if user if exist in DB
  const user = await prismaClient.user.findUnique({
    where: { email }
  })
  if(!user) {
    res.status(404)
    throw new Error("User does not exist");
  } 

  // Check if token already exist for the user
  const tokenExist = await prismaClient.token.findUnique({
    where: { userId: user.id }
  })
  if(tokenExist) {
    const currentTime = new Date()
    const tokenCreationTime = tokenExist.createdAt
    const timeDiff = currentTime.getTime() - tokenCreationTime.getTime()

    if(timeDiff > 60000) {
      // delete token
      await prismaClient.token.delete({
        where: { userId: user.id }
      })
    } else {
      res.status(400)
      throw new Error("Token already created, please try again after 1 minute.");
    }

  } 
  // Create Reset Token
  let resetToken = crypto.randomBytes(32).toString('hex') + user.id
  console.log("reset token:", resetToken);
  // Hash token before saving to DB
  const hashedToken = crypto.createHash("sha256")
    .update(resetToken)
    .digest("hex")
  // Save token to DB
  await prismaClient.token.create({
    data: {
      userId: user.id,
      token: hashedToken,
      createdAt: new Date(),
      // expiresAt: new Date(Date.now() + 30 * (60 * 1000)) //30 mins
      expiresAt: new Date(Date.now() + 30 * (60 * 1000000)) //3000 mins
    }
  })

  //Construct Reset Url
  const resetUrl = `${FRONTEND_URL}/resetpassword/${resetToken}`
  //Reset Email
  const message = `
      <h2>Hello ${user.name}</h2>
      <p>Please use the url below to reset your password.</p>
      <p>This reset link is valid for only 30minutes.</p>
      <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
      <p>Regards</p>
      <p>My Team</p>
    `;
  const subject =  "Password Reset Request"  
  const send_to = user.email
  const sent_from  = EMAIL_USER
  const reply_to = EMAIL_USER;

  try {
    // await sendEmail({
    //   subject, message, send_to, sent_from, reply_to
    // })
    res.status(200).json({
      success:true, 
      message: "Reset Email Sent"})
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to send reset email" });
  }

});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
   // Extract password from request body
  let password = req.body.password;
  // Extract the resetToken from the request params
  const { resetToken } = req.params;
  
  // Hash Token then compare to DB
  const hashedToken = crypto.createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const userToken = await prismaClient.token.findFirst({
    where: {
      token: hashedToken,
      expiresAt: { gt: new Date() } // gt - greater than current time
    }
  });
  if (!userToken) {
    res.status(404);
    throw new Error("Invalid or Expired Token");
  }

  const user = await prismaClient.user.findUnique({
    where: { id: userToken.userId }
  });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  try {
    // Hash the new password
    const hashedNewPassword = hashSync(password, 10);

    // Update the user's password in the database
    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword
      }
    });

    res.status(200).json({
      message: "Password Reset is Successful, Please Log in"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to reset password"
    });
  }
});


