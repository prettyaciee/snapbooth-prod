import express, { type Express } from "express";
import cors from "cors";
import { errorHandler } from "./errorHandler";
import { notFound } from "./notFound";
import { requestLogger } from "./requestLogger";

export function registerRequestMiddlewares(app: Express): void {
  app.use(requestLogger);
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

export function registerTerminalMiddlewares(app: Express): void {
  app.use(notFound);
  app.use(errorHandler);
}
