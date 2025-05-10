import { prismaClient } from "@repo/db/client";
import { Router, Request, Response } from "express";


const router: any = Router();
const typedRouter = router as any;


typedRouter.get('/users', async (req: Request, res: Response) => {

    const users = await prismaClient.user.findMany({

    });
    
    return res.json({ users })

})

typedRouter.post('/check-email', async (req: Request, res: Response) => {

    const { email } = req.body;

    const user = await prismaClient.user.findFirst({
        where: {
            email: email
        }
    })

    if(!user) {
        return res.json({
            message: "Email not found"
        })
    }

    return res.json({
        message: "Email found"
    })
})


export const generalRouter = typedRouter;
