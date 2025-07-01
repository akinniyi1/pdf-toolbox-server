// index.js (backend)
import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { Telegraf, Markup } from "telegraf";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DATA_PATH = "/mnt/data/users.json";

// Ensure storage
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}
const readUsers = () => fs.readJson(DATA_PATH);
const writeUsers = (u) => fs.writeJson(DATA_PATH, u);

const upload = multer({ storage: multer.memoryStorage() });

// Telegram Bot
if (BOT_TOKEN) {
  const bot = new Telegraf(BOT_TOKEN);
  bot.start(async (ctx) => {
    const tg = ctx.from;
    const id = `tg_${tg.id}`;
    const users = await readUsers();

    // Save profile
    users[id] = users[id] || {
      name: tg.first_name,
      username: tg.username,
      count: 0,
      pro: false,
      proUntil: null,
      avatar: "",
    };
    await writeUsers(users);

    const webAppUrl = "https://pdf-toolbox-client.onrender.com";
    return ctx.reply(
      `👋 Hi ${tg.first_name}! Open PDF Toolbox:`,
      Markup.inlineKeyboard([
        Markup.button.webApp("🚀 Open PDF Toolbox", webAppUrl),
      ])
    );
  });
  bot.launch();
}

// Express setup
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root
app.get("/", (req, res) => {
  res.send("✅ PDF Toolbox API is running");
});

// User GET/POST
app.get("/user/:id", async (req, res) => {
  const users = await readUsers();
  const user = users[req.params.id];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});
app.post("/user/:id", async (req, res) => {
  const users = await readUsers();
  const id = req.params.id;
  users[id] = { ...(users[id] || {}), ...req.body };
  await writeUsers(users);
  res.json({ success: true });
});

// PDF Processing
app.post("/process", upload.single("file"), async (req, res) => {
  try {
    const { tool, userId } = req.body;
    const buff = req.file?.buffer;
    if (!tool || !buff) {
      return res.status(400).json({ error: "Missing tool or file" });
    }
    const pdf = await PDFDocument.load(buff);
    let out;
    if (tool === "Merge PDF") {
      out = await PDFDocument.create();
      const pages = await out.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } else if (tool === "Split PDF") {
      out = await PDFDocument.create();
      const [pg] = await out.copyPages(pdf, [0]);
      out.addPage(pg);
    } else if (tool === "Compress PDF") {
      out = pdf;
    } else {
      return res.status(400).json({ error: "Unknown tool" });
    }
    const bytes = await out.save();
    res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${tool.replace(
          /\s+/g,
          "_"
        )}.pdf`,
      })
      .send(Buffer.from(bytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PDF processing failed" });
  }
});

// Start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
