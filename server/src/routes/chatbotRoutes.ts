import { Router } from "express";
import { handleChat } from "../controllers/chatbotController";

const router = Router();

router.post("/api/chatbot", handleChat);

export default router;
