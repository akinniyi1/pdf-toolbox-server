import express from "express";
import cors from "cors";
import fs from "fs-extra";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";
const MESSAGES_PATH = "/mnt/data/support_messages.json";

app.use(cors());
app.use(express.json());

// Ensure files exist
await fs.ensureFile(DATA_PATH);
await fs.ensureFile(MESSAGES_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) await fs.writeJson(DATA_PATH, {});
if (!(await fs.readJson(MESSAGES_PATH).catch(() => false))) await fs.writeJson(MESSAGES_PATH, []);

// Helper functions
const readUsers = async () => fs.readJson(DATA_PATH);
const writeUsers = async (data) => fs.writeJson(DATA_PATH, data);
const readMessages = async () => fs.readJson(MESSAGES_PATH);
const writeMessages = async (data) => fs.writeJson(MESSAGES_PATH, data);

// Register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const users = await readUsers();
  if (users[email]) return res.status(409).json({ error: "Email already exists" });

  users[email] = { email, password, pro: false, count: 0, created: Date.now() };
  await writeUsers(users);
  res.json({ success: true });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await readUsers();
  const user = users[email];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid login" });
  }
  res.json({ success: true, user });
});

// Get all users (admin only)
app.get("/admin/users", async (req, res) => {
  const email = req.query.email;
  if (email !== "akinrinadeakinniyi9@gmail.com") return res.status(403).json({ error: "Forbidden" });

  const users = await readUsers();
  res.json(users);
});

// Support message
app.post("/support", async (req, res) => {
  const { email, message } = req.body;
  if (!email || !message) return res.status(400).json({ error: "Missing data" });

  const messages = await readMessages();
  messages.push({ email, message, time: new Date().toISOString() });
  await writeMessages(messages);
  res.json({ success: true });
});

// Get all messages (admin only)
app.get("/admin/messages", async (req, res) => {
  const email = req.query.email;
  if (email !== "akinrinadeakinniyi9@gmail.com") return res.status(403).json({ error: "Forbidden" });

  const messages = await readMessages();
  res.json(messages);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
