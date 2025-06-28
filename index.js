import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import TelegramBot from "node-telegram-bot-api";
import { PDFDocument } from "pdf-lib";

const app = express();
const port = process.env.PORT || 3000;
const uploadDir = "uploads";

// Telegram bot setup
const botToken = "7950996097:AAFZ6otnKgYaeg7dPmV8ea5zacpkXqKkpY4";
const bot = new TelegramBot(botToken, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Welcome to PDF Toolbox!", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📂 Open PDF Toolbox WebApp",
            web_app: { url: "https://pdf-toolbox-client.onrender.com" },
          },
        ],
      ],
    },
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Ensure upload folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files
app.use("/uploads", express.static(uploadDir));
const upload = multer({ dest: uploadDir + "/" });

// Root endpoint
app.get("/", (req, res) => {
  res.send("PDF Toolbox API is running!");
});

// Tool processing endpoint
app.post("/process", upload.array("files"), async (req, res) => {
  const files = req.files;
  const tool = req.body.tool;

  if (!files || files.length < 1 || !tool) {
    return res.status(400).json({ error: "At least 1 file and tool name required" });
  }

  try {
    if (tool === "Merge PDF") {
      if (files.length < 2) return res.status(400).json({ error: "Merge needs at least 2 PDFs" });

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
        message: "PDFs merged!",
        download: `https://${req.headers.host}/uploads/${outName}`
      });
    }

    if (tool === "Compress PDF") {
      const file = files[0];
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const compressedBytes = await pdf.save();
      const outName = `compressed-${Date.now()}.pdf`;
      const outputPath = path.join(uploadDir, outName);
      fs.writeFileSync(outputPath, compressedBytes);

      return res.json({
        message: "PDF compressed (naive).",
        download: `https://${req.headers.host}/uploads/${outName}`
      });
    }

    if (tool === "Split PDF") {
      const file = files[0];
      const fileBytes = fs.readFileSync(file.path);
      const pdf = await PDFDocument.load(fileBytes);
      const totalPages = pdf.getPageCount();

      const zipName = `split-${Date.now()}.zip`;
      const zipPath = path.join(uploadDir, zipName);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      archive.pipe(output);

      for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);
        const pdfBytes = await newPdf.save();
        archive.append(Buffer.from(pdfBytes), { name: `page-${i + 1}.pdf` });
      }

      await archive.finalize();

      output.on("close", () => {
        return res.json({
          message: `Split into ${totalPages} pages.`,
          download: `https://${req.headers.host}/uploads/${zipName}`
        });
      });

      output.on("error", (err) => {
        console.error(err);
        return res.status(500).json({ error: "Split failed" });
      });

      return;
    }

    return res.status(400).json({ error: "Unknown or unsupported tool." });

  } catch (err) {
    console.error("Processing error:", err);
    return res.status(500).json({ error: "Processing failed." });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
