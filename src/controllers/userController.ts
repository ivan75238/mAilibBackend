import { Request, Response } from "express";
import pool from "../db";
import IUserDto from "../interfaces/mailib/dto/IUserDto";

const getCurrentUser = async (req: Request, res: Response) => {
  //@ts-ignore
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { rows } = await pool.query<IUserDto>(
    "SELECT * FROM users WHERE id = $1",
    [userId]
  );

  req.session.user = rows[0];

  res.json(rows[0]);
};

const getUserByEmail = async (email: string) => {
  const { rows } = await pool.query<IUserDto>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (!rows.length) {
    return undefined;
  }

  return rows[0];
};

export default { getCurrentUser, getUserByEmail };
