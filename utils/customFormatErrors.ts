import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError, GraphQLFormattedError } from "graphql";

function customFormatErrors(formattedError: GraphQLFormattedError, error: any) {
  const code = formattedError?.extensions?.code;
  switch (code) {
    case "NOT_FOUND":
      return {
        ...formattedError,
        message: formattedError.message,
      };
    case ApolloServerErrorCode.GRAPHQL_PARSE_FAILED:
      return {
        ...formattedError,
        message:
          "The provided query contains syntax errors and cannot be parsed. Please check your syntax and try again",
      };
    case ApolloServerErrorCode.GRAPHQL_VALIDATION_FAILED:
      return {
        ...formattedError,
        message:
          "The provided query does not match the server's schema. Please verify the field names, arguements and structure of your query.",
      };
    case ApolloServerErrorCode.BAD_USER_INPUT:
      return {
        ...formattedError,
        message:
          "One or more input values are invalid. Please check your input and try again",
      };
    case ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND:
      return {
        ...formattedError,
        message:
          "The requested query could not be found in the server's persisted queries. Please provide the complete query or check the persited query ID. ",
      };
    case ApolloServerErrorCode.PERSISTED_QUERY_NOT_SUPPORTED:
      return {
        ...formattedError,
        message:
          "Persisted queries are not supported by this server. Please send the full query text instead",
      };
    case ApolloServerErrorCode.OPERATION_RESOLUTION_FAILURE:
      return {
        ...formattedError,
        message:
          "Unable to resolve the intended operation. Please specify the operation name if sending multiple operations in a single request.",
      };
    case ApolloServerErrorCode.BAD_REQUEST:
      return {
        ...formattedError,
        message:
          "The server could not process your request due to malformed syntax or an invalid structure. Please verify the request and try again.",
      };
    case ApolloServerErrorCode.INTERNAL_SERVER_ERROR:
      return {
        ...formattedError,
        message:
          "An unexpected error occurred on the server. Please try again later or contact support if the issue persists.",
      };
    default:
      return formattedError;
  }
}

export default customFormatErrors;
