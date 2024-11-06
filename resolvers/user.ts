import pool from "../config/db";
import bcrypt from "bcrypt";
import { MyContext } from "../models/db";
import { GraphQLFieldResolver } from 'graphql';

const resolvers = {
  Query: {
    getUser: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query(
        "SELECT id, username FROM users WHERE  id = $1",
        [id]
      );
      return result.rows[0];
    },
  },

  Mutation: {
    createUser: async (
      _: any,
      {
        username,
        email,
        password,
      }: { username: string; email: string; password: string },
      { pool }: MyContext
    ) => {
      const hashedPassword = await bcrypt.hash(password, 12);

      const result = await pool.query(
        "INSERT INTO users (username, email, password VALUES ($1, $2, $3) RETURNING id, username",
        [username, email, hashedPassword]
      );

      return result.rows[0];
    },

    updateUser: async (
      _: any,
      { id, username, email }: { id: string; username: string; email: string },
      { pool }: MyContext
    ) => {
      const result = await pool.query(
        "UPDATE users SET usernam=$1, email= $2 WHERE id = $3 RETURNING id, username, email",
        [username, email, id]
      );

      if (result.rowCount === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    },

    deleteUser: async (_: any, { id }: { id: string }, { pool }: MyContext) => {
      const result = await pool.query(
        "DELETE FROM users WHERE id=$1 RETURNING id, username",
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error("User not found");
      }

      return result.rows[0];
    },
  },
};

export default resolvers;
