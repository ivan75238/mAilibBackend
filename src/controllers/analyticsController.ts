import { Request, Response } from "express";
import pool from "../db";
import { getUserInSession } from "../utils/getUserInSession";
import getFamilyAnalyticsSql from "../sql/getFamilyAnalyticsSql";
import getUserAnalyticsSql from "../sql/getUserAnalyticsSql";

const getFamilyAnalitics = async (req: Request<{}, {}, {}>, res: Response) => {
  const user = getUserInSession(req, res);

  const { rows } = await pool.query(getFamilyAnalyticsSql, [user.id]);

  res.json(rows);
};

const getUserAnalitics = async (req: Request<{}, {}, {}>, res: Response) => {
  const user = getUserInSession(req, res);

  const { rows } = await pool.query(getUserAnalyticsSql, [user.id]);

  res.json(rows);
};

export default { getFamilyAnalitics, getUserAnalitics };
