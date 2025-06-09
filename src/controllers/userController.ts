import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export default {
  getAllUsers: (req: Request, res: Response) => {
    res.json([{ id: 1, name: 'John Doe' }]);
  }
};