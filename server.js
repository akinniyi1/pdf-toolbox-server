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

app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const user = users[req.params.id] || { pro: false, count: 0 };
  res.json(user);
});

app.post("/user/:id", async (req, res) => {
  const users = await readData();
  const { count, pro, proUntil } = req.body;
  users[req.params.id] = {
    ...(users[req.params.id] || {}),
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
