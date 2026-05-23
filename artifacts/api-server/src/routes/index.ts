import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mealsRouter from "./meals";
import groceryRouter from "./grocery";
import profileRouter from "./profile";
import openaiRouter from "./openai";
import authRouter from "./auth";
import cartRouter from "./cart";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mealsRouter);
router.use(groceryRouter);
router.use(profileRouter);
router.use(openaiRouter);
router.use(authRouter);
router.use(cartRouter);

export default router;
