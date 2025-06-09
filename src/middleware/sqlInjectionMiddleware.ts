import { Request, Response, NextFunction } from "express";

export default (req: Request, res: Response, next: NextFunction) => {
  const sqlKeywords = [
    "SELECT",
    "INSERT",
    "DELETE",
    "UPDATE",
    "DROP",
    "UNION",
    "--",
  ];
  const inputs = { ...req.body, ...req.query, ...req.params };

  for (const key in inputs) {
    const value = String(inputs[key]).toUpperCase();
    if (sqlKeywords.some((keyword) => value.includes(keyword))) {
      res.status(400).send("Potential SQL injection detected");
      return;
    }
  }

  next();
};
