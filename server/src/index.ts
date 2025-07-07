import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { context, ApolloContext } from './graphql/context';
import { typeDefs } from './graphql/typedefs';
import { resolvers } from './graphql/resolvers';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db';


dotenv.config();

const startServer = async () => {
  const app = express();

  // Create Apollo Server instance
  const server = new ApolloServer<ApolloContext>({
    typeDefs,
    resolvers,
  });

  // Start Apollo Server
  await server.start();

  // Use JSON parsing middleware from Express
  app.use(express.json()); // This replaces bodyParser.json()

  // Enable CORS and use Apollo middleware for GraphQL endpoint
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(), // Enables cross-origin requests
    expressMiddleware(server, {
      context,
    })  // Connects Apollo to Express
  );

  const PORT = process.env.PORT || 4000;

  // Connect to MongoDB
  await connectDB(process.env.MONGO_URI as string);

  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
};

startServer();
