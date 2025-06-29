import express from "express";
import cors from "cors";
import fs from "fs-extra";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

app.use(cors());
app.use(express.json());

// Ensure the data file exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Helper functions
const readUsers = async () => fs.readJson(DATA_PATH);
const writeUsers = async (users) => fs.writeJson(DATA_PATH, users);

// Signup route
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  const users = await readUsers();

  if (users[email]) {
    return res.status(400).json({ error: "User already exists" });
  }

  users[email] = {
    email,
    password,
    pro: false,
    count: 0,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  await writeUsers(users);
  res.json({ success: true });
});

// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const users = await readUsers();
  const user = users[email];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ success: true, user });
});

// Get user info
app.get("/user/:email", async (req, res) => {
  const users = await readUsers();
  const user = users[req.params.email];

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json(user);
});

// Update user (e.g. upgrade to pro, count usage)
app.post("/user/:email", async (req, res) => {
  const users = await readUsers();
  const existing = users[req.params.email] || {};
  users[req.params.email] = { ...existing, ...req.body };
  await writeUsers(users);
  res.json({ success: true });
});

// Contact support
app.post("/support", async (req, res) => {
  const { email, message } = req.body;

  if (!email || !message) return res.status(400).json({ error: "Email and message required" });

  const users = await readUsers();
  const user = users[email];

  if (!user) return res.status(404).json({ error: "User not found" });

  user.messages.push({ message, time: new Date().toISOString() });

  await writeUsers(users);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
