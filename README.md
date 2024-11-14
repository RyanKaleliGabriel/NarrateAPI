# NarrateApi

> This is a GraphQL API for a personal blogging platform.

## Table of Contents

- [Take Aways](#take-aways)
- [Requirements](#requirements)
- [Stack](#stack)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Take Aways

- Understand what the GraphQL APIs are including best practices and conventions

- Querying and updating related data in a single request.

- Understanding GraphQL security practices.

## Requirements

- Create a new blog post
- Update an existing blog post
- Delete an existing blog post
- Get a single blog post
- Get all blog posts
- Filter blog posts by a search term

## Stack

- NodeJs
- Express
- PostgreSQL
- Docker Compose

## Error Handling

**Built In Apollo Error Codes** - Configured a service to handle the new v4 apollo server errors and modified their messages.
**Custom Error** - Used the custom error technique in scenarios where the built in error codes could not apply

## Best Practices

**Nullability**
**Pagination**
**Server-Side Batching/Caching**
**ApolloServerPluginDrainHttpServer** - Used this plugin for graceful shutdown of the express server.
**Gzip Compression** - Decreased the size of the response body.
**X-Powered-By Header** - Disbaled this header to reduce fingerprinting. Reduces the ability of attacker to determine the software the server uses.
