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
import { Request } from "express";
import { Connection, PublicKey } from "@solana/web3.js";

interface AuthenticatedRequest extends Request {
  userId?: string; // or `number` if userId is always a number
}
const PARENT_WALLET_ADDRESS = "CmccrPtk1k1x71pnX5N1vo2TujEBoaV59tHR2hPagWVU";
const connection = new Connection(
  "https://solana-devnet.g.alchemy.com/v2/zGB45bQOXCJGbUUTskN6_c_wMqyikks1",
  "confirmed" // Commitment level
);

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
  const { publicKey, signature } = req.body;
  const message = new TextEncoder().encode("Sign into mechanical turks");

  const result = nacl.sign.detached.verify(
    message,
    new Uint8Array(signature.data),
    new PublicKey(publicKey).toBytes()
  );

  if (!result) {
    return res.status(411).json({
      message: "Incorrect signature",
    });
  }

  const existingUser = await prismaClient.user.findFirst({
    where: {
      address: publicKey,
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
        address: publicKey,
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

  const user = await prismaClient.user.findFirst({
    where: {
      id: userId,
    },
  });

  if (!parseData.success) {
    return res.status(411).json({
      message: "You've sent the wrong inputs",
    });
  }

  const transaction = await connection.getTransaction(
    parseData.data.signature,
    {
      maxSupportedTransactionVersion: 1,
    }
  );

  console.log(transaction);

  if (
    (transaction?.meta?.postBalances[1] ?? 0) -
      (transaction?.meta?.preBalances[1] ?? 0) !==
    100000000
  ) {
    return res.status(411).json({
      message: "Transaction signature/amount incorrect",
    });
  }

  if (
    transaction?.transaction.message.getAccountKeys().get(1)?.toString() !==
    PARENT_WALLET_ADDRESS
  ) {
    return res.status(411).json({
      message: "Transaction sent to wrong address",
    });
  }

  if (
    transaction?.transaction.message.getAccountKeys().get(0)?.toString() !==
    user?.address
  ) {
    return res.status(411).json({
      message: "Transaction sent to wrong address",
    });
  }
  // was this money paid by this user address or a different address?

  // parse the signature here to ensure the person has paid 0.1 SOL
  // const transaction = Transaction.from(parseData.data.signature);

  let response = await prismaClient.$transaction(async (tx) => {
    const response = await tx.task.create({
      data: {
        title: parseData.data.title ?? DEFAULT_TITLE,
        amount: 0.1 * TOTAL_DECIMALS,
        //TODO: Signature should be unique in the table else people can reuse a signature
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

router.get("/task", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Query Params:", req.query); // Debug log

    // Match the query parameter key as sent by the client (taskid)
    const taskId = req.query.taskid
      ? parseInt(String(req.query.taskid), 10)
      : undefined;
    const userId = req.userId ? parseInt(req.userId, 10) : undefined;

    console.log(
      "Parsed taskId:",
      taskId,
      "userId:",
      userId,
      "Type:",
      typeof taskId
    );

    if (!taskId || isNaN(taskId) || !userId || isNaN(userId)) {
      return res.status(400).json({
        message: "Invalid taskId or userId provided",
      });
    }

    const taskDetails = await prismaClient.task.findFirst({
      where: {
        user_id: userId,
        id: taskId,
      },
      include: {
        options: true,
      },
    });

    if (!taskDetails) {
      return res.status(403).json({
        message: "You don't have access to this task",
      });
    }

    const responses = await prismaClient.submission.findMany({
      where: {
        task_id: taskId,
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

    responses.forEach((response) => {
      if (result[response.option_id]) {
        result[response.option_id].count++;
      }
    });

    res.json({
      result,
      taskDetails,
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({
      message: "An error occurred while processing your request",
    });
  }
});

export default router;
