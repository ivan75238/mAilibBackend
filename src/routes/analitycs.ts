import { Router } from "express";
import analyticsController from "../controllers/analyticsController";

const router = Router();

router.get("/family", analyticsController.getFamilyAnalitics);
router.get("/user", analyticsController.getUserAnalitics);

export default router;
