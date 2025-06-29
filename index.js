import express from "express";
import cors from "cors";
import fs from "fs-extra";
import bcrypt from "bcrypt";

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
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const users = await readData();
  if (users[email]) return res.status(400).json({ error: "User exists" });

  const hash = await bcrypt.hash(password, 10);
  users[email] = { password: hash, count: 0, pro: false, proUntil: null };
  await writeData(users);
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await readData();
  const user = users[email];

  if (!user) return res.status(403).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(403).json({ error: "Invalid password" });

  res.json({ success: true, user: { email, count: user.count, pro: user.pro, proUntil: user.proUntil } });
});

app.get("/user/:email", async (req, res) => {
  const users = await readData();
  const user = users[req.params.email];
  if (!user) return res.status(404).json({ error: "Not found" });

  if (user.pro && user.proUntil && new Date(user.proUntil).getTime() < Date.now()) {
    user.pro = false;
    user.proUntil = null;
    users[req.params.email] = user;
    await writeData(users);
  }

  res.json(user);
});

app.post("/user/:email", async (req, res) => {
  const users = await readData();
  const { count, pro, proUntil } = req.body;
  users[req.params.email] = {
    ...(users[req.params.email] || {}),
    ...(count !== undefined && { count }),
    ...(pro !== undefined && { pro }),
    ...(proUntil !== undefined && { proUntil }),
  };
  await writeData(users);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
