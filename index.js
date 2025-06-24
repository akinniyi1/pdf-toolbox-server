import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from uploads
app.use("/uploads", express.static(uploadDir));

// Multer config
const upload = multer({ dest: uploadDir + "/" });

// Default route
app.get("/", (req, res) => {
  res.send("PDF Toolbox API is running!");
});

// Main processing route
app.post("/process", upload.array("files"), async (req, res) => {
  const files = req.files;
  const tool = req.body.tool;

  if (!files || files.length < 1 || !tool) {
    return res.status(400).json({ error: "At least 1 file and tool name required" });
  }

  try {
    // 1) MERGE PDF
    if (tool === "Merge PDF") {
      if (files.length < 2) {
        return res.status(400).json({ error: "Merge requires at least 2 PDFs" });
      }
      const { PDFDocument } = await import("pdf-lib");
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const fileBytes = fs.readFileSync(file.path);
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const mergedBytes = await mergedPdf.save();
      const outName = `merged-${Date.now()}.pdf`;
      const outputPath = path.join(uploadDir, outName);
      fs.writeFileSync(outputPath, mergedBytes);

      return res.json({
        message: "PDFs merged successfully!",
        download: `https://${req.headers.host}/${uploadDir}/${outName}`
      });
    }

    // 2) SPLIT PDF
    if (tool === "Split PDF") {
      // Only take first file for split
      const file = files[0];
      const { PDFDocument } = await import("pdf-lib");
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const totalPages = pdf.getPageCount();

      // Prepare zip
      const zipName = `split-${Date.now()}.zip`;
      const zipPath = path.join(uploadDir, zipName);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      // For each page, create a new PDF and append to zip
      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        // append buffer with a filename like page-1.pdf
        archive.append(Buffer.from(pdfBytes), { name: `page-${i + 1}.pdf` });
      }

      await archive.finalize();
      // Wait for stream to finish
      output.on("close", () => {
        return res.json({
          message: `PDF split into ${totalPages} pages.`,
          download: `https://${req.headers.host}/${uploadDir}/${zipName}`
        });
      });
      output.on("error", (err) => {
        console.error(err);
        return res.status(500).json({ error: "Split failed" });
      });
      return;
    }

    // 3) COMPRESS PDF (naive re-save; may not significantly reduce size)
    if (tool === "Compress PDF") {
      const file = files[0];
      const { PDFDocument } = await import("pdf-lib");
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      // Naive: re-save. True compression often needs external tools.
      const compressedBytes = await pdf.save();
      const outName = `compressed-${Date.now()}.pdf`;
      const outputPath = path.join(uploadDir, outName);
      fs.writeFileSync(outputPath, compressedBytes);

      return res.json({
        message: "PDF re-saved (naive compress).",
        download: `https://${req.headers.host}/${uploadDir}/${outName}`
      });
    }

    // 4) LOCK PDF (password-protect): placeholder
    if (tool === "Protect PDF" || tool === "Lock PDF") {
      // PDF-lib does not support encryption out-of-the-box.
      return res.status(400).json({
        error: "Lock/Protect not supported in this deployment."
      });
    }

    // 5) UNLOCK PDF (remove password): placeholder
    if (tool === "Unlock PDF") {
      // Requires decryption support not in pdf-lib here.
      return res.status(400).json({
        error: "Unlock not supported in this deployment."
      });
    }

    // 6) PDF to Word: placeholder
    if (tool === "PDF to Word") {
      return res.status(400).json({
        error: "PDF to Word not supported here. Consider integrating an external conversion service."
      });
    }

    // 7) PDF to Image: placeholder
    if (tool === "PDF to Image") {
      return res.status(400).json({
        error: "PDF to Image not supported here. Consider integrating an external conversion service."
      });
    }

    // Unknown tool
    return res.status(400).json({ error: "Unknown tool" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Processing failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
