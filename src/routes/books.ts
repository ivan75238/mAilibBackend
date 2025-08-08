import { Router } from "express";
import bookController from "../controllers/bookController";

const router = Router();

router.get("/search", bookController.search);
router.get("/book/:id", bookController.getBookByIdRequest);
router.post("/book/:id/add", bookController.addBookInLibrary);
router.post("/book/:id/remove", bookController.removeBookFromLibrary);
router.get(
  "/book/:id/existInfamily",
  bookController.getUsersIdWhoDoesntHaveBook
);
router.get("/library", bookController.getUserLibrary);

export default router;
