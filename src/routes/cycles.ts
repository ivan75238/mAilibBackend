import { Router } from "express";
import cycleController from "../controllers/cycleController";

const router = Router();

router.get("/all", cycleController.getAllCycles);

export default router;
