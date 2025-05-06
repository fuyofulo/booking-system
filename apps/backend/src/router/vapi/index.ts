import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth";
import { checkPermission } from "../../middlewares/checkPermission";

const router: any = Router();
const typedRouter = router as any;


typedRouter.post('createAssistant', authMiddleware, checkPermission("canManageStaff"), async (req: Request, res: Response) => {
   
})





export const vapiRouter = typedRouter;
