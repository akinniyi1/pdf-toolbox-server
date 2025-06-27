import express from "express";
import fs from "fs-extra";
import cors from "cors";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/users.json";

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
