import { Router } from "express";
import {
  clearCollections,
  dropCollections,
  dropDatabase,
  listCollections,
  getCollectionDocuments,
  deleteDocuments,
  deleteAllDocuments,
} from "../controllers/adminDb.controller";

const router = Router();

router.get("/collections", listCollections);
router.get("/collections/:collectionName/documents", getCollectionDocuments);
router.delete("/collections/:collectionName/documents", deleteDocuments);
router.delete("/collections/:collectionName/documents/all", deleteAllDocuments);
router.post("/collections/clear", clearCollections);
router.post("/collections/drop", dropCollections);
router.post("/database/drop", dropDatabase);

export default router;
