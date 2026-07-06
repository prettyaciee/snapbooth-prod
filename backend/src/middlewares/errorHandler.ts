import type { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  req.log.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
}
