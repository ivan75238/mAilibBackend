import { Router } from 'express';
import UserController from '../controllers/userController';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();


// Защищенные маршруты (требуют JWT)
router.get('/users', authMiddleware, UserController.getAllUsers);

export default router;