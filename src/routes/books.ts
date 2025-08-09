import { Router } from "express";
import bookController from "../controllers/bookController";

const router = Router();

router.get("/search", bookController.search);
router.get("/book/:type/:id", bookController.getBookByIdRequest);
router.post("/book/:type/:id/add", bookController.addBookInLibrary);
router.post("/book/:type/:id/remove", bookController.removeBookFromLibrary);
router.get(
  "/book/:type/:id/existInfamily",
  bookController.getUsersIdWhoDoesntHaveBook
);
router.get("/library", bookController.getUserLibrary);

export default router;
