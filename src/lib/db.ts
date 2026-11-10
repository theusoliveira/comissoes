import "server-only";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não configurada (veja o README).");

export const sql = neon(url);
