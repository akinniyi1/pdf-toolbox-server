import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// File upload config
const upload = multer({ dest: "uploads/" });

// Test route
app.get("/", (req, res) => {
  res.send("PDF Toolbox API is running!");
});

// POST route to handle PDF + tool
app.post("/process", upload.single("file"), (req, res) => {
  const file = req.file;
  const tool = req.body.tool;

  if (!file || !tool) {
    return res.status(400).json({ error: "File or tool not provided" });
  }

  console.log(`Received file: ${file.originalname}`);
  console.log(`Tool selected: ${tool}`);

  // TODO: Process PDF with selected tool

  return res.json({ success: true, message: `${tool} in progress` });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
