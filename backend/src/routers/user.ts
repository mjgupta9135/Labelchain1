import nacl from "tweetnacl";
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { createTaskInput } from "../types";

const PARENT_WALLET_ADDRESS = "2KeovpYvrgpziaDsq8nbNMP4mc48VNBVXb5arbqrg9Cq";

const DEFAULT_TITLE = "Select the most clickable thumbnail";
const prismaClient = new PrismaClient();

const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.accessKey ?? "",
    secretAccessKey: process.env.secretAccess ?? "",
  },
  region: "us-east-1",
});

const router = Router();

router.get("/presignedUrl", authMiddleware, async (req, res) => {
  // @ts-ignore
  const userId = req.userId;

  const { url, fields } = await createPresignedPost(s3Client, {
    Bucket: "label-chain",
    Key: `label/${userId}/${Math.random()}/image.png`,
    Conditions: [
      ["content-length-range", 0, 5 * 1024 * 1024], // 5 MB max
    ],
    Fields: {
      "Content-Type": "image/png",
    },
    Expires: 3600,
  });
  console.log(url, fields);
  res.json({
    preSignedUrl: url,
    fields,
  });
});

router.post("/signin", async (req, res) => {
  const hardCoded = "abcd";

  const existingUser = await prismaClient.user.findFirst({
    where: {
      address: hardCoded,
    },
  });

  if (existingUser) {
    const token = jwt.sign(
      {
        userId: existingUser.id,
      },
      JWT_SECRET
    );

    res.json({
      token,
    });
  } else {
    const user = await prismaClient.user.create({
      data: {
        address: hardCoded,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
      },
      JWT_SECRET
    );

    res.json({
      token,
    });
  }
});

export default router;
