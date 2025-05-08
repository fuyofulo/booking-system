import { Router, Request, Response } from "express";
import { prismaClient } from "@repo/db/client";
import { SignInSchema, SignUpSchema } from "@repo/schemas/types";
import { JWT_SECRET } from "@repo/secrets/config";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const router: any = Router();
const typedRouter = router as any;

typedRouter.post("/signup", async (req: Request, res: Response) => {
  const data = req.body;
  const parsedData = SignUpSchema.safeParse(data);

  if (!parsedData.success) {
    return res.json({
      message: "enter proper credentials",
    });
  }

  const existingUser = await prismaClient.user.findFirst({
    where: {
      email: parsedData.data.email,
    },
  });

  if (existingUser) {
    res.json({
      message: "user already exists",
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(parsedData.data.password, 10);

  const user = await prismaClient.user.create({
    data: {
      name: parsedData.data.name,
      email: parsedData.data.email,
      password: hashedPassword,
    },
  });

  if (!user) {
    res.json({
      message: "internal error creating user",
    });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);

  res.json({
    token,
  });
});

typedRouter.post("/signin", async (req: Request, res: Response) => {
  const data = req.body;
  const parsedData = SignInSchema.safeParse(data);
  if (!parsedData.success) {
    return res.json({
      message: "invalid credentials",
    });
  }

  const user = await prismaClient.user.findFirst({
    where: {
      email: parsedData.data.email,
    },
  });

  if (!user) {
    return res.json({
      message: "user does not exist",
    });
  }

  const passwordMatch = await bcrypt.compare(
    parsedData.data.password,
    user.password
  );

  if (!passwordMatch) {
    return res.json({
      message: "incorrect password",
    });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET);

  res.json({
    token,
  });
});

export const userRouter = typedRouter;
