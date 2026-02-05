import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id?: number | string;
      email?: string;
      username?: string;
      [key: string]: unknown;
    } | null;
  }
}
