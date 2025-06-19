import { Router } from "express";
import UserController from "../controllers/userController";  

const router = Router();

router.get("/current", UserController.getCurrentUser);

export default router;
