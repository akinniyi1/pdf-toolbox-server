import express from "express";
import cors from "cors";
import fs from "fs-extra";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = "/mnt/data/users.json";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

await fs.ensureFile(DATA_PATH);
if (!(await fs.readJson(DATA_PATH).catch(() => false))) {
  await fs.writeJson(DATA_PATH, {});
}

const readData = async () => fs.readJson(DATA_PATH);
const writeData = async (data) => fs.writeJson(DATA_PATH, data);

app.post("/process", upload.single("file"), async (req, res) => {
  const tool = req.body.tool;
  const file = req.file;

  if (!file || !tool) {
    return res.status(400).json({ error: "Missing file or tool" });
  }

  try {
    const inputPdf = await PDFDocument.load(file.buffer);
    let outputPdf;

    switch (tool) {
      case "Compress PDF":
        outputPdf = inputPdf;
        break;

      case "Merge PDF":
        outputPdf = await PDFDocument.create();
        const copiedPages = await outputPdf.copyPages(inputPdf, inputPdf.getPageIndices());
        copiedPages.forEach((page) => outputPdf.addPage(page));
        break;

      case "Split PDF":
        outputPdf = await PDFDocument.create();
        const firstPage = await outputPdf.copyPages(inputPdf, [0]);
        outputPdf.addPage(firstPage[0]);
        break;

      default:
        return res.status(400).json({ error: "Tool not implemented yet" });
    }

    const pdfBytes = await outputPdf.save();
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=processed.pdf`,
    });
    res.send(pdfBytes);
  } catch (err) {
    console.error("Error processing PDF:", err);
    res.status(500).json({ error: "Something went wrong during PDF processing" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
