import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

// Setup __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload dir exists
const upload = multer({ dest: "/mnt/data/uploads" });

app.use(cors());
app.use(express.json());

// Ensure user data file exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// === USER ROUTES ===
app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;

  let user = users[id] || { pro: false, count: 0, proUntil: null };
  if (user.pro && user.proUntil) {
    const now = Date.now();
    const expiry = new Date(user.proUntil).getTime();
    if (now > expiry) {
      user.pro = false;
      user.proUntil = null;
      users[id] = user;
      await writeData(users);
    }
  }

  res.json(user);
});

app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;
  const { count, pro, proUntil, name, username, photo } = req.body;

  users[id] = {
    ...(users[id] || {}),
    ...(count !== undefined && { count }),
    ...(pro !== undefined && { pro }),
    ...(proUntil !== undefined && { proUntil }),
    ...(name && { name }),
    ...(username && { username }),
    ...(photo && { photo }),
  };

  await writeData(users);
  res.json({ success: true });
});

// === PROCESS PDF ROUTE (EXAMPLE ONLY) ===
app.post("/process", upload.single("file"), async (req, res) => {
  try {
    const { tool, userId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Simulate tool usage (actual tool logic should go here)
    console.log(`Received file: ${file.originalname} for tool: ${tool}`);

    // Respond with dummy success
    res.json({
      success: true,
      message: `Tool ${tool} applied successfully.`,
    });
  } catch (err) {
    console.error("Process error:", err);
    res.status(500).json({ error: "Processing failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
