import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { Telegraf, Markup } from "telegraf";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const DATA_PATH = "/mnt/data/users.json";

///////////////////////////////////////////////////////////////////////////////
// Setup directory & storage
///////////////////////////////////////////////////////////////////////////////
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}
const readUsers = () => fs.readJson(DATA_PATH);
const writeUsers = (u) => fs.writeJson(DATA_PATH, u);

const upload = multer({ storage: multer.memoryStorage() }); // keep file in memory

///////////////////////////////////////////////////////////////////////////////
// Telegram Bot with Telegraf
///////////////////////////////////////////////////////////////////////////////
if (!BOT_TOKEN) console.warn("⚠️ BOT_TOKEN not set – bot won’t start");
else {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    const tg = ctx.from;
    const id = `tg_${tg.id}`;
    const users = await readUsers();

    // persist basic profile
    users[id] = users[id] || {
      first_name: tg.first_name || "",
      username: tg.username || "",
      count: 0,
      pro: false,
      proUntil: null,
    };
    await writeUsers(users);

    const webAppUrl = "https://pdf-toolbox-client.onrender.com"; // your frontend
    return ctx.reply(
      `👋 Hi ${tg.first_name}! Open the PDF Toolbox:`,
      Markup.inlineKeyboard([Markup.button.webApp("🚀 Open PDF Toolbox", webAppUrl)])
    );
  });

  bot.launch();
  console.log("🤖 Telegram bot launched");
}

///////////////////////////////////////////////////////////////////////////////
// Express Middleware & Root Route
///////////////////////////////////////////////////////////////////////////////
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("✅ PDF Toolbox API is running");
});

///////////////////////////////////////////////////////////////////////////////
// User GET/POST
///////////////////////////////////////////////////////////////////////////////
app.get("/user/:id", async (req, res) => {
  const users = await readUsers();
  const user = users[req.params.id];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.post("/user/:id", async (req, res) => {
  const users = await readUsers();
  const id = req.params.id;
  users[id] = {
    ...(users[id] || {}),
    ...(req.body.first_name && { first_name: req.body.first_name }),
    ...(req.body.username && { username: req.body.username }),
  };
  await writeUsers(users);
  res.json({ success: true });
});

///////////////////////////////////////////////////////////////////////////////
// PDF Processing: Merge / Split / Compress
///////////////////////////////////////////////////////////////////////////////
app.post("/process", upload.single("file"), async (req, res) => {
  try {
    const { tool, userId } = req.body;
    const fileBuffer = req.file?.buffer;
    if (!tool || !fileBuffer) {
      return res.status(400).json({ error: "Missing tool or file" });
    }

    const pdf = await PDFDocument.load(fileBuffer);

    let outPdf;
    if (tool === "Merge PDF") {
      // for demo merging a single file into itself
      outPdf = await PDFDocument.create();
      const pages = await outPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((p) => outPdf.addPage(p));
    } else if (tool === "Split PDF") {
      outPdf = await PDFDocument.create();
      const [first] = await outPdf.copyPages(pdf, [0]);
      outPdf.addPage(first);
    } else if (tool === "Compress PDF") {
      outPdf = pdf; // no-op: pdf-lib doesn’t compress well
    } else {
      return res.status(400).json({ error: "Unknown tool" });
    }

    const outBytes = await outPdf.save();
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${tool.replace(/\s+/g, "_")}.pdf`,
    });
    return res.send(Buffer.from(outBytes));
  } catch (err) {
    console.error("PDF process error:", err);
    return res.status(500).json({ error: "PDF processing failed" });
  }
});

///////////////////////////////////////////////////////////////////////////////
// Start Server
///////////////////////////////////////////////////////////////////////////////
app.listen(PORT, () => {
  console.log(`🌐 Server listening on port ${PORT}`);
});
