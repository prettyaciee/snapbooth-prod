import type { NextFunction, Request, Response } from "express";

export type CreateRoomLocals = {
  groupSize: number;
};

export function validateCreateRoom(
  req: Request,
  res: Response<unknown, CreateRoomLocals>,
  next: NextFunction,
): void {
  const { groupSize } = req.body as { groupSize?: unknown };
  const size = Number(groupSize);

  if (!size || size < 2 || size > 6 || !Number.isInteger(size)) {
    res.status(400).json({ error: "groupSize must be an integer between 2 and 6" });
    return;
  }

  res.locals.groupSize = size;
  next();
}
