import { Router } from "express";
import genreController from "../controllers/genreController";

const router = Router();

router.get("/all", genreController.getAllGenres);

export default router;
