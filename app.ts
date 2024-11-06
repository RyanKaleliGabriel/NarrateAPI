import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import gql from "graphql-tag";
import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { expressMiddleware } from "@apollo/server/express4";
import pool from "./config/db";

import resolvers from "./resolvers/user";
import { readFileSync } from "fs";
import { MyContext } from "./models/db";

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Read Schema from file ensure the path is correct
const typeDefs = gql(
  readFileSync("schema.graphql", {
    encoding: "utf-8",
  })
);

// Create Apollo server
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
  context: ({ req }) => ({
    pool, // Pass the database pool as part of the context
  }),
});

const startServer = async () => {
  await server.start(); // Start the apollo server

  // MIddleware for apollo server graphql endpoint
  app.use("/graphql", cors(), express.json(), expressMiddleware(server));

  app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
    console.log(`GraphQL endpoint: http://localhost:${PORT}/graphql`);
  });
};

startServer();
