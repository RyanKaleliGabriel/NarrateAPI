import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import gql from "graphql-tag";
import path from "path";
import { Pool } from "pg"; // Import pg
import { readFileSync } from "fs";
import resolvers from "./resolvers/post";
import { MyContext } from "./types/db";

dotenv.config();


// Read Schema from file ensure the path is correct
const typeDefs = gql(
  readFileSync(path.join(__dirname, "schema.graphql"), {
    encoding: "utf-8",
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Apollo server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const startServer = async () => {

  await server.start(); // Start the apollo server
  // MIddleware for apollo server graphql endpoint
  // he context property may not be defined directly when instantiating the ApolloServer object in this way.
  // To resolve this, we can pass the context when setting up the middleware (expressMiddleware) instead.
  app.use(
    "/graphql",
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async (): Promise<MyContext> => ({ pool }), // Set context here
    })
  );

  app.listen(PORT, () => {
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((error) => {
  console.error("Unable to connect to database:", error);
});
