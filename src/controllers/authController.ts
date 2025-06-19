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
  req: Request<
    {},
    {},
    {
      email?: string;
      password?: string;
      firstName: string;
      lastName: string;
      middleName?: string;
    }
  >,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { email, password, firstName, lastName, middleName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const userInDb = await getUser(email);

  if (userInDb) {
    res.status(400).json({ message: "Пользователь уже существует" });
    return;
  }

  const code = generateRandomCode();

  const user: Partial<IUserDto> = {
    id: uuidv4(),
    email,
    hash: getStringHash(password),
    code,
    first_name: firstName,
    last_name: lastName,
    middle_name: middleName,
  };

  await pool.query(
    "INSERT INTO users(id, email, hash, code, first_name, last_name, middle_name) values($1, $2, $3, $4, $5, $6, $7)",
    [...Object.values(user)]
  );

  // Отправка кода на электронную почту
  sendEmail(email, `<p>Код для подтверждения регистрации: <b>${code}</b></p>`);

  res.status(201).json({ message: "User must be verified" });
};

const resendCode = async (
  req: Request<
    {},
    {},
    {
      email?: string;
    }
  >,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const userInDb = await getUser(email);

  if (!userInDb) {
    res.status(400).json({ message: "Пользователь не существует" });
    return;
  }

  if (userInDb.verified) {
    res.status(400).json({ message: "Пользователь уже подтвержден" });
    return;
  }

  // Отправка кода на электронную почту
  sendEmail(
    email,
    `<p>Код для подтверждения регистрации: <b>${userInDb.code}</b></p>`
  );

  res.status(201).json({ message: "Email was sending" });
};

const sendChangePassword = async (
  req: Request<
    {},
    {},
    {
      email?: string;
    }
  >,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const userInDb = await getUser(email);

  if (!userInDb) {
    res.status(400).json({ message: "Пользователь не существует" });
    return;
  }

  const token = uuidv4();

  await pool.query("UPDATE users SET change_pass_token = $1 WHERE id = $2", [
    token,
    userInDb.id,
  ]);

  const link = `https://mailib.ru/up_pas/${token}`;

  // Отправка кода на электронную почту
  sendEmail(
    email,
    `<p>Ссылка для восстановления пароля: <b><a href="${link}">${link}<a/></b></p>`
  );

  res.status(201).json({ message: "Email was sending" });
};

const changePassword = async (
  req: Request<
    {},
    {},
    {
      token?: string;
      password?: string;
      passwordRepeat?: string;
    }
  >,
  res: Response
) => {
  if (!req.body) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { password, passwordRepeat, token } = req.body;

  if (!password || !passwordRepeat || !token) {
    res.status(400).json({ message: "Invalid data" });
    return;
  }

  const { rows } = await pool.query<IUserDto>(
    "SELECT * FROM users WHERE change_pass_token = $1",
    [token]
  );

  const userInDb = rows.length > 0 ? rows[0] : null;

  if (!userInDb) {
    res.status(400).json({ message: "Не верный токен" });
    return;
  }

  await pool.query("UPDATE users SET hash = $1 WHERE id = $2", [
    getStringHash(password),
    userInDb.id,
  ]);

  res.status(201).json({ message: "Пароль успешно изменен" });
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
    res.status(400).json({ message: "Пользователь не найден" });
    return;
  }

  if (code !== userInDb.code) {
    res.status(400).json({ message: "Неверный код" });
    return;
  }

  await pool.query("UPDATE users SET verified = true WHERE email = $1", [
    userInDb.email,
  ]);

  res.status(200).json({ message: "Верификация пройдена успешно" });
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

  req.session.user = user;

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

export default {
  register,
  verify,
  login,
  refreshToken,
  logout,
  resendCode,
  sendChangePassword,
  changePassword,
};
