import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../db";
import IUserDto from "../interfaces/mailib/dto/IUserDto";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";
import sendEmail from "../utils/sendEmail";

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

const getStringHash = (str: string, algorithm: string = "sha256"): string => {
  const hash = createHash(algorithm);
  hash.update(str);
  return hash.digest("hex");
};

const generateRandomCode = (): string => {
  const code = Math.floor(Math.random() * 1000000);
  return code.toString().padStart(6, "0");
};

const getUser = async (email: string) => {
  const { rows } = await pool.query<IUserDto>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  return rows.length > 0 ? rows[0] : null;
};

const register = async (
  req: Request<{}, {}, { email?: string; password?: string }>,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const userInDb = await getUser(email);

  if (userInDb) {
    res.status(400).json({ message: "User already exists" });
    return;
  }

  const code = generateRandomCode();

  const user: Partial<IUserDto> = {
    id: uuidv4(),
    email,
    first_name: "User",
    hash: getStringHash(password),
    code,
  };

  await pool.query(
    "INSERT INTO users(id, email, first_name, hash, code) values($1, $2, $3, $4, $5)",
    [...Object.values(user)]
  );

  // Отправка кода на электронную почту
  sendEmail(email, `<p>Код для подтверждения регистрации: <b>${code}</b></p>`);

  res.status(201).json({ message: "User must be verified" });
};

const verify = async (
  req: Request<{}, {}, { code?: string; email?: string }>,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { code, email } = req.body;

  if (!email || !code) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const userInDb = await getUser(email);

  if (!userInDb) {
    res.status(400).json({ message: "User not exists" });
    return;
  }

  if (code !== userInDb.code) {
    res.status(400).json({ message: "Code is not valid" });
    return;
  }

  await pool.query("UPDATE users SET verified = true WHERE email = $1", [
    userInDb.email,
  ]);

  res.status(200).json({ message: "Success" });
};

const login = async (
  req: Request<{}, {}, { password?: string; email?: string }>,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { password, email } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { rows } = await pool.query<IUserDto>(
    "SELECT * FROM users WHERE email = $1 AND hash = $2",
    [email, getStringHash(password)]
  );

  if (rows.length === 0) {
    res.status(400).json({ message: "Invalid credentials" });
    return;
  }

  const user = rows[0];

  // Генерация access токена
  const accessToken = jwt.sign({ userId: user.id }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  // Генерация refresh токена
  const refreshToken = jwt.sign({ userId: user.id }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });

  await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
    refreshToken,
    user.id,
  ]);

  res.json({
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 минут в секундах
  });
  return;
};

const refreshToken = async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  const refreshToken = authHeader && authHeader.split(" ")[1];

  if (!refreshToken) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  try {
    // Проверка валидности refresh токена
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as {
      userId: string;
    };

    // Проверка наличия токена в базе
    const { rows } = await pool.query(
      "SELECT id FROM users WHERE id = $1 AND refresh_token = $2",
      [decoded.userId, refreshToken]
    );

    if (rows.length === 0) {
      res.status(403).json({ error: "Invalid refresh token" });
      return;
    }

    // Генерация нового access токена
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    // Генерация refresh токена
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId },
      REFRESH_TOKEN_SECRET,
      {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }
    );

    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [
      newRefreshToken,
      decoded.userId,
    ]);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Refresh token expired" });
      return;
    }

    res.status(403).json({ error: "Invalid token" });
  }
};

const logout = async (req: Request, res: Response) => {
  const userId = (req as any).userId; // Из middleware аутентификации

  try {
    // Удаление refresh токена из базы
    await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [
      userId,
    ]);

    res.json({ message: "Successfully logged out" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export default { register, verify, login, refreshToken, logout };
