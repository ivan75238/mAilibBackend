import { Request, Response } from "express";

const getCurrentUser = (req: Request, res: Response) => {
  const user = req.session.user;

  if (!user) { 
    res.status(401).json({ error: "Unauthorized" });
  }
  
  res.json(user);
};

export default { getCurrentUser };
