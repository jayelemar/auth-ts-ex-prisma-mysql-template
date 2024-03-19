import express, { Request, Response, Express } from 'express';
import { PORT } from './secrets';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import rootRouter from './routes';
import { errorHandler } from './middlewares/errorMiddleware';
import cookieParser from 'cookie-parser'

const app:Express = express();
app.use(cookieParser())
app.use(bodyParser.json());
app.use(
  cors({
    origin: [
      "localhost:5173", //vite
      "localhost:3000", //nextjs
      "https://your-frontend-website.com",
    ],
  credentials: true
  })
);

app.use('/api', rootRouter)

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World, from TypeScript Express Server!');
});

export const prismaClient = new PrismaClient({
  // log:['query']
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});