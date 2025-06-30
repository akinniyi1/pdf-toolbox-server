import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs-extra";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";
const UPLOAD_PATH = "/mnt/data/uploads";

const upload = multer({ dest: UPLOAD_PATH });

app.use(cors());
app.use(express.json());

// Ensure data files/folders exist
await fs.ensureDir(UPLOAD_PATH);
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Read/Write user data
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// GET user info
app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;

  let user = users[id] || {
    pro: false,
    count: 0,
    proUntil: null,
    name: "",
  };

  // Downgrade expired Pro
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

// POST update user info
app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;
  const { count, pro, proUntil, name } = req.body;

  users[id] = {
    ...(users[id] || {}),
    ...(count !== undefined && { count }),
    ...(pro !== undefined && { pro }),
    ...(proUntil !== undefined && { proUntil }),
    ...(name !== undefined && { name }),
  };

  await writeData(users);
  res.json({ success: true });
});

// Tool processing endpoint
app.post("/process", upload.single("file"), async (req, res) => {
  const { tool, userId } = req.body;
  const file = req.file;

  if (!file || !tool || !userId) {
    return res.status(400).json({ error: "Missing file, tool or userId" });
  }

  console.log(`Received file ${file.originalname} for ${tool} from user ${userId}`);

  // Simulate processing
  return res.json({ success: true, message: `Tool '${tool}' processed successfully.` });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
