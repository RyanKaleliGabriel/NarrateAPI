import { Pool } from "pg";
import { GraphQLFormattedError } from "graphql";

export interface MyContext {
  pool:Pool;
  // formattedError:GraphQLFormattedError
  // error:any
}
