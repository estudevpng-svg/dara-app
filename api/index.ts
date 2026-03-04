import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { initDb } from "../src/server/app";

let isInitialized = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isInitialized) {
    await initDb();
    isInitialized = true;
  }
  return app(req, res);
}
