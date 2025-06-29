import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import archiver from "archiver";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname in ES Module style
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_PATH = "/mnt/data/users.json";
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Initialize
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

// Ensure disk storage exists
await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}
await fs.ensureDir(UPLOAD_DIR);

// Multer setup
const upload = multer({ dest: UPLOAD_DIR + "/" });

// Disk read/write functions
const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

// ===========================
// USER ROUTES
// ===========================

app.get("/user/:id", async (req, res) => {
  const users = await readData();
  const user = users[req.params.id];
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
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

// ===========================
// PROCESSING ROUTE
// ===========================

app.post("/process", upload.array("files"), async (req, res) => {
  const files = req.files;
  const tool = req.body.tool;

  if (!files || files.length < 1 || !tool) {
    return res.status(400).json({ error: "At least 1 file and tool name required" });
  }

  try {
    const { PDFDocument } = await import("pdf-lib");

    // MERGE
    if (tool === "Merge PDF") {
      if (files.length < 2) {
        return res.status(400).json({ error: "Merge requires at least 2 PDFs" });
      }

      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const fileBytes = fs.readFileSync(file.path);
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      const outName = `merged-${Date.now()}.pdf`;
      const outputPath = path.join(UPLOAD_DIR, outName);
      fs.writeFileSync(outputPath, mergedBytes);

      return res.json({
        message: "PDFs merged successfully!",
        download: `${req.protocol}://${req.headers.host}/uploads/${outName}`,
      });
    }

    // SPLIT
    if (tool === "Split PDF") {
      const file = files[0];
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const totalPages = pdf.getPageCount();

      const zipName = `split-${Date.now()}.zip`;
      const zipPath = path.join(UPLOAD_DIR, zipName);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(page);
        const pdfBytes = await newPdf.save();
        archive.append(Buffer.from(pdfBytes), { name: `page-${i + 1}.pdf` });
      }

      await archive.finalize();
      output.on("close", () => {
        return res.json({
          message: "PDF split successfully!",
          download: `${req.protocol}://${req.headers.host}/uploads/${zipName}`,
        });
      });

      output.on("error", (err) => {
        console.error(err);
        return res.status(500).json({ error: "Failed to create zip" });
      });
      return;
    }

    // COMPRESS
    if (tool === "Compress PDF") {
      const file = files[0];
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdf.save();

      const outName = `compressed-${Date.now()}.pdf`;
      const outputPath = path.join(UPLOAD_DIR, outName);
      fs.writeFileSync(outputPath, compressedBytes);

      return res.json({
        message: "PDF compressed (naively).",
        download: `${req.protocol}://${req.headers.host}/uploads/${outName}`,
      });
    }

    // UNIMPLEMENTED TOOLS
    return res.status(400).json({ error: "Tool not implemented yet." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Processing failed." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
