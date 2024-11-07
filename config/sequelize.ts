// This is the database connection

import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

const dbConfig = {
  HOST: String(process.env.DB_HOST),
  USER: String(process.env.DB_USER),
  PASSWORD: String(process.env.DB_PASSWORD),
  DB: String(process.env.DB_NAME),
  port: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 1000,
  },
};

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: "postgres",
  port: dbConfig.port,
  pool: dbConfig.pool,
});

export default sequelize;
