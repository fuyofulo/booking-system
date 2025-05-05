import { prismaClient } from "@repo/db/client";
import { Router, Request, Response } from "express";


const router: any = Router();
const typedRouter = router as any;


typedRouter.get('/users', async (req: Request, res: Response) => {

    const users = await prismaClient.user.findMany({

    });
    
    return res.json({ users })

})


export const generalRouter = typedRouter;
