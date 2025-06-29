import express from "express";
import cors from "cors";
import fs from "fs-extra";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

app.use(cors());
app.use(express.json());

await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const users = await readData();
  if (users[email]) return res.status(400).json({ error: "User already exists" });

  users[email] = { email, password, count: 0, pro: false, proUntil: null };
  await writeData(users);
  res.json(users[email]);
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await readData();
  if (!users[email]) return res.status(404).json({ error: "User not found" });
  if (users[email].password !== password)
    return res.status(403).json({ error: "Invalid credentials" });

  res.json(users[email]);
});

app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const { count, pro, proUntil } = req.body;
  const id = req.params.id;

  users[id] = {
    ...(users[id] || {}),
    ...(count !== undefined && { count }),
    ...(pro !== undefined && { pro }),
    ...(proUntil !== undefined && { proUntil }),
  };

  await writeData(users);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
