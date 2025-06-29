import express from "express";
import fs from "fs-extra";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";
const SUPPORT_PATH = "/mnt/data/support.json";
const ADMIN_EMAIL = "akinrinadeakinniyi9@gmail.com";

app.use(cors({ origin: true }));
app.use(express.json());

// Ensure storage files exist
await fs.ensureFile(DATA_PATH);
await fs.ensureFile(SUPPORT_PATH);

if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}
if (!(await fs.readJson(SUPPORT_PATH).catch(() => false))) {
  await fs.writeJson(SUPPORT_PATH, []);
}

// Utils
const readUsers = async () => fs.readJson(DATA_PATH);
const writeUsers = async (data) => fs.writeJson(DATA_PATH, data);
const readSupport = async () => fs.readJson(SUPPORT_PATH);
const writeSupport = async (data) => fs.writeJson(SUPPORT_PATH, data);

// Register route
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const users = await readUsers();

  if (users[email]) {
    return res.status(400).json({ error: "User already exists" });
  }

  users[email] = {
    password,
    createdAt: Date.now(),
    count: 0,
    pro: false,
    proUntil: null
  };

  await writeUsers(users);
  res.json({ success: true, user: { email, pro: false, count: 0 } });
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await readUsers();

  if (!users[email]) {
    return res.status(400).json({ error: "User not found" });
  }

  if (users[email].password !== password) {
    return res.status(401).json({ error: "Incorrect password" });
  }

  const user = users[email];
  res.json({ success: true, user: { email, pro: user.pro, count: user.count, proUntil: user.proUntil } });
});

// Get user data
app.get("/user/:email", async (req, res) => {
  const users = await readUsers();
  const user = users[req.params.email];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Update user data
app.post("/user/:email", async (req, res) => {
  const users = await readUsers();
  const { count, pro, proUntil } = req.body;

  if (!users[req.params.email]) {
    return res.status(404).json({ error: "User not found" });
  }

  if (count !== undefined) users[req.params.email].count = count;
  if (pro !== undefined) users[req.params.email].pro = pro;
  if (proUntil !== undefined) users[req.params.email].proUntil = proUntil;

  await writeUsers(users);
  res.json({ success: true });
});

// Support chat message
app.post("/support", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing fields" });

  const supportMessages = await readSupport();
  supportMessages.push({ email, message, time: new Date().toISOString() });

  await writeSupport(supportMessages);
  res.json({ success: true });
});

// Admin: Get all users
app.get("/admin/users", async (req, res) => {
  const email = req.query.email;
  if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Unauthorized" });

  const users = await readUsers();
  res.json(users);
});

// Admin: Get support messages
app.get("/admin/support", async (req, res) => {
  const email = req.query.email;
  if (email !== ADMIN_EMAIL) return res.status(403).json({ error: "Unauthorized" });

  const messages = await readSupport();
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
