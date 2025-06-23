import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in uploads folder
app.use("/uploads", express.static("uploads"));

// Multer config to accept multiple files
const upload = multer({ dest: "uploads/" });

// Default route
app.get("/", (req, res) => {
  res.send("PDF Toolbox API is running!");
});

// Merge PDF route
app.post("/process", upload.array("files"), async (req, res) => {
  const files = req.files;
  const tool = req.body.tool;

  if (!files || files.length < 2 || !tool) {
    return res.status(400).json({ error: "At least 2 files and tool name required" });
  }

  if (tool !== "Merge PDF") {
    return res.json({ message: `${tool} in progress (not yet supported)` });
  }

  try {
    const { PDFDocument } = await import("pdf-lib");

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();

    const outputPath = `uploads/merged-${Date.now()}.pdf`;
    fs.writeFileSync(outputPath, mergedBytes);

    return res.json({
      message: "PDFs merged successfully!",
      download: `https://${req.headers.host}/${outputPath}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Merge failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
