import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";

export async function withServer<T>(
  app: Express,
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const { port } = server.address() as AddressInfo;

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}
