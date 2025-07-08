import { Router } from "express";
import familyController from "../controllers/familyController";

const router = Router();

router.post("/create", familyController.create);
router.get("/get", familyController.get);
router.post("/dissolve", familyController.dissolve);
router.get("/invite/list", familyController.inviteList);
router.post("/invite/send", familyController.inviteToFamily);
router.post("/invite/reject", familyController.rejectInvited);
router.post("/invite/accept", familyController.acceptInvited);

export default router;
