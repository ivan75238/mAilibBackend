import cors from "cors";
import express from "express";
import session from "express-session";
import bearerToken from "express-bearer-token";
import dotenv from "dotenv";
import mainRouter from "./routes/users";
import bookRouter from "./routes/books";
import analitycsRouter from "./routes/analitycs";
import genresRouter from "./routes/genres";
import authorsRouter from "./routes/authors";
import cyclesRouter from "./routes/cycles";
import familyRouter from "./routes/family";
import pool from "./db";
import authController from "./controllers/authController";
import sqlInjectionMiddleware from "./middleware/sqlInjectionMiddleware";
import authMiddleware from "./middleware/authMiddleware";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  "https://mailib.ru",
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Если используете куки/авторизацию
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(sqlInjectionMiddleware);
app.use(bearerToken());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// Публичные маршруты
app.post("/register", authController.register);
app.post("/login", authController.login);
app.post("/verify", authController.verify);
app.post("/refresh", authController.refreshToken);
app.post("/logout", authController.logout);
app.post("/resendCode", authController.resendCode);
app.post("/sendChangePassword", authController.sendChangePassword);
app.post("/changePassword", authController.changePassword);

app.use("/users", authMiddleware, mainRouter);
app.use("/books", authMiddleware, bookRouter);
app.use("/family", authMiddleware, familyRouter);
app.use("/authors", authMiddleware, authorsRouter);
app.use("/genres", authMiddleware, genresRouter);
app.use("/cycles", authMiddleware, cyclesRouter);
app.use("/analytics", authMiddleware, analitycsRouter);

// Роут для тестирования БД
app.get("/test-db", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT version()");
    res.json({ postgresVersion: rows[0].version });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database query failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
