import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
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

  app.use(express.json());
  app.use(cookieParser());

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({
      origin: true,
      credentials: true,
    }),
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
