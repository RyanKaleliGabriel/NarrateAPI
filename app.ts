import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const app = express();

// Reducing Finger printing.
// By default express sends the X-powered-By response header that you can disable using the app.disable() method.
app.disable("x-powered-by");

// Middleware
app.use(cors());

// Prevent XSS Attack by setting special headers
app.use(helmet({ contentSecurityPolicy: false }));

// Limit requests fro the same API
// const limiter = rateLimit({
//   windowMs: 10 * 60 * 1000,
//   limit: 100,
//   message: "Too many requests from this IP please try again in an hour",
// });
// app.use(limiter);

// GZIP compression
app.use(compression());
app.use(express.json());

export default app;
