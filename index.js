import express from "express";
import cors from "cors";
import fs from "fs-extra";
import { Telegraf, Markup } from "telegraf";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DATA_PATH = "/mnt/data/users.json";

const bot = new Telegraf(BOT_TOKEN);

app.use(cors());
app.use(express.json());

// Ensure users.json exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

const readUsers = async () => fs.readJson(DATA_PATH);
const writeUsers = async (data) => fs.writeJson(DATA_PATH, data);

// Telegram bot start command
bot.start(async (ctx) => {
  const tgUser = ctx.from;
  const id = `tg_${tgUser.id}`;
  const users = await readUsers();

  if (!users[id]) {
    const photo_url = tgUser.username
      ? `https://t.me/i/userpic/320/${tgUser.username}.jpg`
      : "";

    users[id] = {
      first_name: tgUser.first_name || "",
      last_name: tgUser.last_name || "",
      username: tgUser.username || "",
      photo_url,
      count: 0,
      pro: false,
      proUntil: null,
    };

    await writeUsers(users);
  }

  const webAppUrl = "https://pdf-toolbox-client.onrender.com";

  ctx.reply(
    `👋 Hello, ${tgUser.first_name || "User"}!`,
    Markup.inlineKeyboard([
      Markup.button.webApp("🚀 Open PDF Toolbox", webAppUrl),
    ])
  );
});

// GET user by ID
app.get("/user/:id", async (req, res) => {
  const users = await readUsers();
  const user = users[req.params.id] || null;
  res.json(user);
});

// UPDATE user data
app.post("/user/:id", async (req, res) => {
  const users = await readUsers();
  const id = req.params.id;

  users[id] = {
    ...(users[id] || {}),
    ...req.body,
  };

  await writeUsers(users);
  res.json({ success: true });
});

app.get("/", (req, res) => {
  res.send("PDF Toolbox API Running");
});

bot.launch();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
