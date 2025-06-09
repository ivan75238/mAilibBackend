import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;

export default (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err: any, decoded: any) => {
    if (err) {
      // Проверяем, истек ли срок действия токена
      if (err.name === "TokenExpiredError") {
        res.status(401).json({
          error: "Token expired",
          code: "TOKEN_EXPIRED", // Специальный код для клиента
        });
        return;
      }
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    // Добавляем ID пользователя в запрос
    (req as any).userId = decoded.userId;
    next();
  });
};
