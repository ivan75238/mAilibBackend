import { Router } from "express";
import bookController from "../controllers/bookController";

const router = Router();

router.get("/search", bookController.search);
router.get("/book/:id", bookController.getBookById);

export default router;
