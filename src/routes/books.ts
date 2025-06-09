import { Router } from "express";
import bookController from "../controllers/bookController";
import authMiddleware from "../middleware/authMiddleware";

const router = Router();

// Защищенные маршруты (требуют JWT)
router.get("/search", authMiddleware, bookController.search);
router.get("/book/:id", authMiddleware, bookController.getBookById);

export default router;
