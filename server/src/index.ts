import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import cors from 'cors';
import { env } from './config/env';
import { context, ApolloContext } from './graphql/context';
import { typeDefs } from './graphql/typedefs';
import { resolvers } from './graphql/resolvers';
import { connect_db } from './config/db';

const start_server = async () => {
  const app = express();

  const server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(helmet());
  app.use(express.json());
  app.use(cookieParser());

  // General rate limiter: 100 requests per 15 minutes per IP
  const general_limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limiter for auth mutations: 5 attempts per 15 minutes
  const auth_limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skip: (req) => {
      const body = (req as any).body;
      if (!body || !body.operationName) return true;
      return !['Login', 'RefreshToken'].includes(body.operationName);
    },
    message: 'Too many auth attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: (origin, callback) => {
        if (!origin || env.ALLOWED_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
    general_limiter,
    auth_limiter,
    expressMiddleware(server, {
      context,
    })
  );

  await connect_db(env.MONGO_URI);

  app.listen(env.PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${env.PORT}/graphql`);
  });
};

start_server();
