import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

// Setup
app.use(cors());
app.use(express.json());

// Ensure user database file exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Helper functions
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// File upload middleware
const upload = multer({
  dest: "/mnt/data/uploads",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
});

// Test root route
app.get("/", (req, res) => {
  res.send("PDF Toolbox backend is running.");
});

// Get user info (with auto downgrade if pro expired)
app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;

  let user = users[id] || { count: 0, pro: false, proUntil: null };

  // Auto-downgrade if pro expired
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

// Update user info
app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const id = req.params.id;
  const { count, pro, proUntil, username, avatar } = req.body;

  users[id] = {
    ...(users[id] || {}),
    ...(count !== undefined && { count }),
    ...(pro !== undefined && { pro }),
    ...(proUntil !== undefined && { proUntil }),
    ...(username !== undefined && { username }),
    ...(avatar !== undefined && { avatar }),
  };

  await writeData(users);
  res.json({ success: true });
});

// Process uploaded PDF
app.post("/process", upload.single("file"), async (req, res) => {
  const { tool, userId } = req.body;
  const file = req.file;

  if (!file || !tool || !userId) {
    return res.status(400).json({ error: "Missing file, tool, or user ID" });
  }

  // Simulate processing and increase usage
  const users = await readData();
  const user = users[userId] || { count: 0, pro: false };

  if (!user.pro && user.count >= 3) {
    return res.status(403).json({ error: "Free limit reached. Upgrade to Pro." });
  }

  // Simulate: In real case, you'd do something with the file
  const newCount = (user.count || 0) + 1;
  users[userId] = { ...user, count: newCount };
  await writeData(users);

  // Delete uploaded file after simulation
  await fs.remove(file.path);

  res.json({ message: `Your file has been processed with "${tool}". Used ${newCount}/3 tools.` });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
