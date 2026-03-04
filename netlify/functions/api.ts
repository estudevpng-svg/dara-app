import serverless from "serverless-http";
import app, { initDb } from "../../src/server/app";

// Initialize Database
initDb();

export const handler = serverless(app);
