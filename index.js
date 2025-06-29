import express from "express";
import cors from "cors";
import fs from "fs-extra";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

// ✅ Allow your frontend link to talk to this backend
app.use(cors({
  origin: "https://pdf-toolbox-client.onrender.com",  // or use "*" if debugging
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Ensure the user DB file exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

// Read/write helpers
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// ✅ Register a new user
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });

  const users = await readData();
  if (users[email]) return res.status(409).json({ error: "User already exists" });

  users[email] = {
    email,
    password,
    count: 0,
    pro: false,
    proUntil: null
  };

  await writeData(users);
  res.json({ success: true, user: users[email] });
});

// ✅ Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const users = await readData();
  const user = users[email];

  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ success: true, user });
});

// ✅ Update usage, pro status, etc
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

// ✅ Get user info
app.get("/user/:email", async (req, res) => {
  const users = await readData();
  const user = users[req.params.email];
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
