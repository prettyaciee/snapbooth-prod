import express, { type Express } from "express";
import {
  registerRequestMiddlewares,
  registerTerminalMiddlewares,
} from "./middlewares";
import router from "./routes";

const app: Express = express();

registerRequestMiddlewares(app);
app.use("/api", router);
registerTerminalMiddlewares(app);

export default app;
