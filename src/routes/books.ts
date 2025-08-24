import { Router } from "express";
import bookController from "../controllers/bookController";

const router = Router();

router.get("/search", bookController.search);
router.get("/book/:type/:id", bookController.getBookByIdRequest);
router.post("/book/:type/:id/add", bookController.addBookInLibrary);
router.post("/book/:type/:id/markAsRead", bookController.markAsRead);
router.post("/book/create", bookController.createBookInDb);
router.post("/book/:type/:id/remove", bookController.removeBookFromLibrary);
router.post("/book/:type/:id/removeMark", bookController.removeMark);
router.get(
  "/book/:type/:id/existInFamily",
  bookController.getUsersIdWhoDoesntHaveBook
);
router.get(
  "/book/:type/:id/readedInFamily",
  bookController.getUsersIdWhoDoesntReadBook
);
router.get("/library", bookController.getUserLibrary);

export default router;
