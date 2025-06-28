import express from "express";
import fs from "fs-extra";
import cors from "cors";
import multer from "multer";
import path from "path";
import { PDFDocument } from "pdf-lib";
import archiver from "archiver";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "./data/users.json";
const upload = multer({ storage: multer.memoryStorage() });

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

// ✅ Main process route (Merge, Compress, Split, etc.)
app.post("/process", upload.array("files"), async (req, res) => {
  const tool = req.body.tool;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  try {
    if (tool === "Merge PDF") {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const pdf = await PDFDocument.load(file.buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const outPath = `./data/result_${Date.now()}.pdf`;
      await fs.writeFile(outPath, pdfBytes);
      return res.json({ download: `${req.protocol}://${req.get("host")}/download/${path.basename(outPath)}` });
    }

    // Add more tools here later...

    res.status(400).json({ message: "Tool not implemented yet" });
  } catch (err) {
    console.error("Process Error:", err);
    res.status(500).json({ message: "Processing failed" });
  }
});

// Serve download files
app.use("/download", express.static("data"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
