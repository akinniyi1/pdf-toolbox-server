import express from "express";
import fs from "fs-extra";
import cors from "cors";
import path from "path";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/users.json";
const WEBAPP_URL = "https://pdf-toolbox-client.onrender.com"; // your frontend

app.use(cors());
app.use(express.json());

// Ensure users.json exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Helper to read/write
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// Get user info
app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const user = users[req.params.id] || { pro: false, count: 0 };
  res.json(user);
});

// Update usage or upgrade
app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const { count, pro } = req.body;
  users[req.params.id] = { ...(users[req.params.id] || {}), count, pro };
  await writeData(users);
  res.json({ success: true });
});

// ✅ Telegram Bot (inline WebApp button)
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "👋 Welcome to PDF Toolbox Bot. Tap the button below to start:", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🚀 Open PDF Toolbox",
            web_app: { url: WEBAPP_URL }
          }
        ]
      ]
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
