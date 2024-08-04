const express = require("express");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

const generatePdf = async (htmlContent, outputPath) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: "networkidle0" });
  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();
};

app.post("/generate-pdf", async (req, res) => {
  try {
    const { base64Html } = req.body;
    if (!base64Html) {
      return res.status(400).send("Base64 HTML content is required");
    }

    const htmlContent = Buffer.from(base64Html, "base64").toString("utf-8");
    const outputPath = path.resolve(__dirname, "output.pdf");

    await generatePdf(htmlContent, outputPath);

    res.setHeader("Content-Disposition", "attachment; filename=output.pdf");
    res.sendFile(outputPath, (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).send("Error generating PDF");
      } else {
        fs.unlinkSync(outputPath); // Optionally delete the generated PDF file
      }
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).send("Error generating PDF");
  }
});

app.get("/", async (req, res) => {
  return res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
