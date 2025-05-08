"use strict";

const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["PORT", "HOST", "MESSAGE"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

// Constants
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const MESSAGE = process.env.MESSAGE || "hello world";

// App
const app = express();
app.get("/", (_req, res) => {
  res.send(MESSAGE);
});

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
