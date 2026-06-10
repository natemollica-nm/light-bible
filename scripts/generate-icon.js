const { createCanvas } = require("canvas");
const { writeFileSync, readFileSync, mkdirSync, existsSync } = require("fs");
const { resolve } = require("path");

const root = resolve(__dirname, "..");
const appJson = JSON.parse(readFileSync(resolve(root, "app.json"), "utf-8"));
const name = appJson.expo.name || "B";
const letter = name[0].toUpperCase();

const size = 1024;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

// Black background
ctx.fillStyle = "#000000";
ctx.fillRect(0, 0, size, size);

// White cross (simple, minimal)
ctx.strokeStyle = "#FFFFFF";
ctx.lineWidth = size * 0.06;
ctx.lineCap = "round";

// Vertical
ctx.beginPath();
ctx.moveTo(size / 2, size * 0.2);
ctx.lineTo(size / 2, size * 0.8);
ctx.stroke();

// Horizontal
ctx.beginPath();
ctx.moveTo(size * 0.3, size * 0.4);
ctx.lineTo(size * 0.7, size * 0.4);
ctx.stroke();

const outDir = resolve(root, "assets/images");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const buffer = canvas.toBuffer("image/png");
writeFileSync(resolve(outDir, "icon.png"), buffer);
console.log("Generated icon.png (1024x1024, monochrome cross)");
