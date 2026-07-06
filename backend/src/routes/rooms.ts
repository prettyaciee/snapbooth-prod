import { Router, type IRouter, type Response } from "express";
import { createRoom, getRoomInfo } from "../lib/roomStore";
import {
  type CreateRoomLocals,
  validateCreateRoom,
} from "../middlewares/validateCreateRoom";

const router: IRouter = Router();

router.post("/rooms", validateCreateRoom, (req, res: Response<{
  roomId: string;
  hostId: string;
  groupSize: number;
}, CreateRoomLocals>): void => {
  const size = res.locals.groupSize;
  const { roomId, hostId } = createRoom(size);
  req.log.info({ roomId, groupSize: size }, "Room created");
  res.status(201).json({ roomId, hostId, groupSize: size });
});

router.get("/rooms/:roomId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const info = getRoomInfo(rawId);
  if (!info) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(info);
});

export default router;
