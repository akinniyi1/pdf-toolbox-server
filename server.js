import express from "express";
import fs from "fs-extra";
import cors from "cors";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json"; // use Render disk here

app.use(cors());
app.use(express.json());

// Ensure users.json exists on render disk
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Helpers to read/write JSON
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// Get user info
app.get("/user/:username", async (req, res) => {
  const users = await readData();
  const user = users[req.params.username] || { pro: false, count: 0 };
  res.json(user);
});

// Update user data
app.post("/user/:username", async (req, res) => {
  const users = await readData();
  const { count, pro } = req.body;
  users[req.params.username] = {
    ...(users[req.params.username] || {}),
    ...(count !== undefined ? { count } : {}),
    ...(pro !== undefined ? { pro } : {}),
  };
  await writeData(users);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
