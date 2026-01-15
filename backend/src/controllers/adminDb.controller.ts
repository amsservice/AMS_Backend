import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth.middleware";

const RESERVED_COLLECTIONS = new Set<string>(["system.indexes"]);

export const listCollections = async (_req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collections = await db.listCollections().toArray();

  const result = collections
    .map((c) => c.name)
    .filter((name) => !!name && !RESERVED_COLLECTIONS.has(name))
    .sort();

  const countsEntries = await Promise.all(
    result.map(async (name) => {
      try {
        const count = await db.collection(name).estimatedDocumentCount();
        return [name, count] as const;
      } catch {
        return [name, 0] as const;
      }
    })
  );

  const counts = Object.fromEntries(countsEntries);

  return res.status(200).json({ collections: result, counts });
};

export const getCollectionDocuments = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collectionName = req.params.collectionName;
  if (!collectionName || typeof collectionName !== "string") {
    return res.status(400).json({ message: "collectionName is required" });
  }

  const cleanName = collectionName.trim();
  if (RESERVED_COLLECTIONS.has(cleanName)) {
    return res.status(400).json({ message: "Cannot access reserved collection" });
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const coll = db.collection(cleanName);
  const total = await coll.countDocuments();
  const documents = await coll.find({}).skip(skip).limit(limit).toArray();

  return res.status(200).json({
    documents: documents.map((doc) => {
      const { _id, ...rest } = doc;
      return {
        _id: _id?.toString(),
        ...rest,
      };
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

export const deleteDocuments = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collectionName = req.params.collectionName;
  if (!collectionName || typeof collectionName !== "string") {
    return res.status(400).json({ message: "collectionName is required" });
  }

  const cleanName = collectionName.trim();
  if (RESERVED_COLLECTIONS.has(cleanName)) {
    return res.status(400).json({ message: "Cannot modify reserved collection" });
  }

  const { documentIds } = req.body;
  if (!Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({ message: "documentIds[] is required" });
  }

  const coll = db.collection(cleanName);
  const objectIds = documentIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter((id): id is mongoose.Types.ObjectId => id !== null);

  const result = await coll.deleteMany({ _id: { $in: objectIds } });

  return res.status(200).json({
    deletedCount: result.deletedCount,
  });
};

export const deleteAllDocuments = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collectionName = req.params.collectionName;
  if (!collectionName || typeof collectionName !== "string") {
    return res.status(400).json({ message: "collectionName is required" });
  }

  const cleanName = collectionName.trim();
  if (RESERVED_COLLECTIONS.has(cleanName)) {
    return res.status(400).json({ message: "Cannot modify reserved collection" });
  }

  const coll = db.collection(cleanName);
  const result = await coll.deleteMany({});

  return res.status(200).json({
    deletedCount: result.deletedCount,
  });
};

export const clearCollections = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collections: unknown = req.body?.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    return res.status(400).json({ message: "collections[] is required" });
  }

  const cleared: Record<string, number> = {};

  for (const name of collections) {
    if (typeof name !== "string" || !name.trim()) continue;
    const clean = name.trim();
    if (RESERVED_COLLECTIONS.has(clean)) continue;

    const coll = db.collection(clean);
    const result = await coll.deleteMany({});
    cleared[clean] = result.deletedCount || 0;
  }

  return res.status(200).json({ cleared });
};

export const dropCollections = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const collections: unknown = req.body?.collections;
  if (!Array.isArray(collections) || collections.length === 0) {
    return res.status(400).json({ message: "collections[] is required" });
  }

  const dropped: string[] = [];
  const failed: Record<string, string> = {};

  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name)
  );

  for (const name of collections) {
    if (typeof name !== "string" || !name.trim()) continue;
    const clean = name.trim();
    if (RESERVED_COLLECTIONS.has(clean)) continue;
    if (!existing.has(clean)) continue;

    try {
      await db.dropCollection(clean);
      dropped.push(clean);
    } catch (e: unknown) {
      failed[clean] = e instanceof Error ? e.message : "Failed to drop";
    }
  }

  return res.status(200).json({ dropped, failed });
};

export const dropDatabase = async (req: AuthRequest, res: Response) => {
  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ message: "DB not connected" });
  }

  const confirm: unknown = req.body?.confirm;
  if (confirm !== "DROP") {
    return res.status(400).json({ message: "confirm must be 'DROP'" });
  }

  await db.dropDatabase();

  return res.status(200).json({ message: "Database dropped" });
};
