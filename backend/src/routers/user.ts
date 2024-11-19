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

router.post("/task", authMiddleware, async (req, res) => {
  //@ts-ignore
  const userId = req.userId;
  // validate the inputs from the user;
  const body = req.body;

  const parseData = createTaskInput.safeParse(body);
  if (!parseData.success) {
    return res.status(411).json({
      message: "You've sent the wrong inputs",
    });
  }

  let response = await prismaClient.$transaction(async (tx) => {
    const response = await tx.task.create({
      data: {
        title: parseData.data.title ?? DEFAULT_TITLE,
        amount: 1 * TOTAL_DECIMALS,
        signature: parseData.data.signature,
        user_id: userId,
      },
    });
    await tx.option.createMany({
      data: parseData.data.options.map((x) => ({
        image_url: x.imageUrl,
        task_id: response.id,
      })),
    });

    return response;
  });
  res.json({
    id: response.id,
  });
});

router.get("/task", authMiddleware, async (req, res) => {
  // @ts-ignore
  const taskId: Number = req.query.taskid;
  // @ts-ignore
  const userId: string = req.userId;

  const taskDetails = await prismaClient.task.findFirst({
    where: {
      user_id: Number(userId),
      id: Number(taskId),
    },
    include: {
      options: true,
    },
  });

  if (!taskDetails) {
    return res.status(411).json({
      message: "You dont have access to this task",
    });
  }

  // Todo: Can u make this faster?
  const responses = await prismaClient.submission.findMany({
    where: {
      task_id: Number(taskId),
    },
    include: {
      option: true,
    },
  });

  const result: Record<
    string,
    {
      count: number;
      option: {
        imageUrl: string;
      };
    }
  > = {};

  taskDetails.options.forEach((option) => {
    result[option.id] = {
      count: 0,
      option: {
        imageUrl: option.image_url,
      },
    };
  });

  responses.forEach((r) => {
    result[r.option_id].count++;
  });

  res.json({
    result,
    taskDetails,
  });
});
export default router;
