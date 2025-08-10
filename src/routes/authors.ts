import { Router } from "express";
import authorController from "../controllers/authorController";

const router = Router();

router.get("/all", authorController.getAllAutors);

export default router;
