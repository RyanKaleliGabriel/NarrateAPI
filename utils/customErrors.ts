import { GraphQLError } from "graphql";

function assetFound(
  resource: any | null,
  message: string = "Resource not found"
) {
  if (!resource) {
    throw new GraphQLError(message, {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return resource;
}

export  { assetFound };
