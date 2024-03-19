import { NextFunction, Request, Response } from "express";
import asyncHandler from 'express-async-handler'
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from "../secrets";
import { prismaClient } from "..";
import { AuthenticatedRequest } from "../types/authTypes";



export const protect = asyncHandler(async ( 
  req:AuthenticatedRequest, 
  res:Response, 
  next:NextFunction 
) => {
  try {
    // Get token from cookies
    const token = req.cookies.token
    if(!token) {
      res.status(401)
      throw new Error("Not authorized, please login.")
    }

    // Verify token
    const verified = jwt.verify(token, JWT_SECRET) as { id: string };
    // Get user Id from verified token
    const user = await prismaClient.user.findUnique({
      where: { id: verified.id},
      select: { id: true },
    })
    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error("Error verifying token");
    
  }
});