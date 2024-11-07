import bcrypt from "bcrypt";
import { User } from "../models/User";

const resolvers = {
  Query: {
    getUser: async (_: any, { id }: { id: string }) => {
      const user = await User.findByPk(id, {
        attributes: ["id", "username", "email"],
      });
      if (!user) {
        throw new Error("User not found");
      }
      return user;
    },
  },

  Mutation: {
    createUser: async (
      _: any,
      {
        username,
        email,
        password,
      }: { username: string; email: string; password: string }
    ) => {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({
        username,
        email,
        password: hashedPassword,
      });
      return user;
    },

    updateUser: async (
      _: any,
      { id, username, email }: { id: string; username: string; email: string }
    ) => {
      const user = await User.findByPk(id);
      if (!user) {
        throw new Error("User not found");
      }
      (user.username = username), (user.email = email);
      await user.save();
      return user;
    },

    deleteUser: async (_: any, { id }: { id: string }) => {
      const user = await User.findByPk(id)
      if(!user){
        throw new Error('User not found')
      }

      await user.destroy()
      return {id: user.id, message: 'User successfully deleted'}
    },
  },
};

export default resolvers;
