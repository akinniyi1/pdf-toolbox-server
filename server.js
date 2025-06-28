import multer from "multer";
import archiver from "archiver";
import { PDFDocument } from "pdf-lib";
import fs from "fs-extra";

const upload = multer({ dest: "uploads/" });

app.post("/process", upload.array("files"), async (req, res) => {
  const tool = req.body.tool;
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "No files uploaded." });
  }

  const outputPath = `./output/${Date.now()}_${tool.replace(" ", "_")}.pdf`;
  await fs.ensureDir("./output");

  try {
    if (tool === "Merge PDF") {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const bytes = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const outBytes = await mergedPdf.save();
      await fs.writeFile(outputPath, outBytes);

    } else if (tool === "Compress PDF") {
      // 🔧 Simple copy for demo. Real compression requires PDF tools.
      await fs.copyFile(files[0].path, outputPath);

    } else {
      return res.status(400).json({ message: "Tool not implemented yet." });
    }

    return res.json({ download: outputPath.replace("./", "/") });

  } catch (err) {
    console.error("Processing failed:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Cleanup uploaded files
    files.forEach(file => fs.remove(file.path));
  }
});
