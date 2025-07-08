import { Request } from "express";

export const checkPostParams = (req: Request, params: string[]) => {
  if (!req.body) {
    return false;
  }

  params.forEach((param) => {
    if (!req.body[param]) {
      return false;
    }
  });

  return true;
};
