import { NextFunction, Request, Response } from 'express'
import { NODE_ENV } from '../secrets'

const errorHandler = (
  err:Error, 
  req: Request, 
  res: Response, 
  next:NextFunction
) => {
  const statusCode = res.statusCode || 500
  res.status(statusCode)
  res.json({
    message: err.message,
    stack: NODE_ENV === "development" ?
      err.stack : null
  })
}

export { errorHandler }

