import { readFileSync } from "fs";
import gql from "graphql-tag";
import path from "path";
import { Pool } from "pg"; // Import pg
// (Resolvers) A map of functions that populate data for individual schema fields.
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import app from "./app";
import resolvers from "./resolvers/post";
import { MyContext } from "./types/db";
import customFormatErrors from "./utils/customFormatErrors";

dotenv.config();

// Read Schema from file ensure the path is correct
// (gql) It is a function that processes GraphQL code (schemas, queries, mutations, etc.) and converts it into a format Apollo Server can use directly.
// (typeDefs) A valid Schema Definition Language (SDL) string, document, or documents that represent your server's GraphQL schema.
const typeDefs = gql(
  readFileSync(path.join(__dirname, "schema.graphql"), {
    encoding: "utf-8",
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const httpServer = http.createServer(app);

// Create Apollo server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: customFormatErrors,
  // To ensure your server gracefully shuts down, we recommend using the ApolloServerPluginDrainHttpServer plugin.
  // Plugins extend Apollo Server's functionality by performing custom operations in response to certain events.
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  //yields a 400 status code when providing invalid variables(Bad request)
  status400ForVariableCoercionErrors: true,
});

const PORT = process.env.PORT || 3000;
const startServer = async () => {
  await server.start(); // Start the apollo server
  // MIddleware for apollo server graphql endpoint
  // The context property may not be defined directly when instantiating the ApolloServer object in this way.
  // To resolve this, we can pass the context when setting up the middleware (expressMiddleware) instead.
  app.use(
    "/graphql",
    cors(),
    express.json(),
    //expressMiddleware  enables you to attach Apollo Server to an Express server.
    // The context function should return an object that all your server's resolvers share during an operation's execution.
    // This enables resolvers to share helpful context values, such as a database connection.
    // The context function receives req and res options which are express.Request and express.Response objects.
    expressMiddleware(server, {
      context: async (): Promise<MyContext> => ({ pool }), // Set context here
    })
  );

  httpServer.listen(PORT, () => {
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer().catch((error) => {
  console.error("Unable to start server:", error);
});
