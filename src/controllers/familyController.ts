import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import pool from "../db";
import UserController from "../controllers/userController";
import { checkPostParams } from "../utils/checkPostParams";
import IInviteToFamilyDto from "../interfaces/mailib/dto/IInviteToFamilyDto";
import { getUserInSession } from "../utils/getUserInSession";
import getFamilySql from "../sql/getFamilySql";
import IFamilyEntity from "../interfaces/mailib/entity/IFamilyEntity";
import getInvitesToFamily from "../sql/getInvitesToFamily";

const create = async (req: Request, res: Response) => {
  const user = getUserInSession(req, res);

  if (user.family_id) {
    res.status(400).json({ error: "You already have a family" });
    return;
  }

  const familyId = uuid();

  await pool.query("INSERT INTO family(id, leader_id) values($1, $2)", [
    familyId,
    user.id,
  ]);

  await pool.query("UPDATE users SET family_id = $1 WHERE id = $2", [
    familyId,
    user.id,
  ]);

  if (req.session.user) req.session.user.family_id = familyId;

  res.status(200).json({ familyId });
};

const get = async (req: Request, res: Response) => {
  const user = getUserInSession(req, res);

  if (!user) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const data = await pool.query<IFamilyEntity>(`${getFamilySql}`, [
    user.family_id,
  ]);

  if (!data.rows.length) {
    res.status(400).json({ error: "Family not found" });
    return;
  }

  res.status(200).json(data.rows[0]);
};

const dissolve = async (req: Request, res: Response) => {
  const user = getUserInSession(req, res);

  const data = await pool.query<IFamilyEntity>(`${getFamilySql}`, [
    user.family_id,
  ]);

  if (!data.rows.length) {
    res.status(400).json({ error: "Family not found" });
    return;
  }

  const family = data.rows[0];

  if (family.leader_id !== user.id) {
    res.status(400).json({ error: "You are not the leader of the family" });
  }

  const placeholders = family.users.map((_, i) => `$${i + 1}`).join(",");
  await pool.query(
    `UPDATE users SET family_id = NULL WHERE id IN (${placeholders})
`,
    family.users.map((i) => i.id)
  );

  await pool.query("DELETE FROM family WHERE id = $1", [family.id]);

  res.status(200).json({ message: "Family was dissolved" });
};

const inviteToFamily = async (
  req: Request<{}, {}, { email: string }>,
  res: Response
) => {
  if (!checkPostParams(req, ["email"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const user = getUserInSession(req, res);

  const { email } = req.body;

  if (!user.family_id) {
    res.status(400).json({ error: "You dont have a family" });
    return;
  }

  if (user.email === email) {
    res.status(400).json({ error: "You can't invite yourself" });
    return;
  }

  const invited_user = await UserController.getUserByEmail(email);

  if (!invited_user) {
    res.status(400).json({ error: "User not found" });
    return;
  }

  const { rows } = await pool.query<IInviteToFamilyDto>(
    "SELECT * FROM invites_to_family WHERE invited_user_id = $1 AND family_id = $2",
    [invited_user.id, user.family_id]
  );

  if (rows.length) {
    res.status(400).json({ error: "Приглашение уже было отправлено ранее" });
  }

  await pool.query(
    "INSERT INTO invites_to_family(id, invited_user_id, family_id) values($1, $2, $3)",
    [uuid(), invited_user.id, user.family_id]
  );

  res.status(200).json({ message: "Приглашение отправлено" });
};

const inviteList = async (req: Request, res: Response) => {
  const user = getUserInSession(req, res);

  const { rows } = await pool.query<IInviteToFamilyDto>(getInvitesToFamily, [
    user.id,
  ]);

  res.status(200).json(rows);
};

const rejectInvited = async (
  req: Request<{}, {}, { invite_id: string }>,
  res: Response
) => {
  if (!checkPostParams(req, ["invite_id"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const { invite_id } = req.body;

  await pool.query("DELETE FROM invites_to_family WHERE id = $1", [invite_id]);

  res.status(200).json({ message: "Приглашение отклонено" });
};

const acceptInvited = async (
  req: Request<{}, {}, { invite_id: string }>,
  res: Response
) => {
  if (!checkPostParams(req, ["invite_id"])) {
    res.status(400).json({ error: "Invalid data" });
    return;
  }

  const user = getUserInSession(req, res);

  const { invite_id } = req.body;

  const { rows } = await pool.query<IInviteToFamilyDto>(
    "SELECT * FROM invites_to_family WHERE id = $1 and invited_user_id = $2",
    [invite_id, user.id]
  );

  if (!rows.length) {
    res.status(400).json({ error: "Приглашение не найдено или уже принято" });
    return;
  }

  const invite = rows[0];

  await pool.query("UPDATE users SET family_id = $1 WHERE id = $2", [
    invite.family_id,
    user.id,
  ]);

  await pool.query("DELETE FROM invites_to_family WHERE id = $1", [invite_id]);

  res.status(200).json({ message: "Приглашение принято" });
};

export default {
  create,
  get,
  inviteToFamily,
  rejectInvited,
  acceptInvited,
  dissolve,
  inviteList,
};
