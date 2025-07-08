import { Response, Request } from "express";
import IUserDto from "../interfaces/mailib/dto/IUserDto";

export const getUserInSession = (req: Request, res: Response) => {  
  if (!req.session.user) {
    res.status(400).json({ error: "User not in session" });
  }

  return req.session.user as IUserDto;
};
