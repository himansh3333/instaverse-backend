require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

const origins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) =>
  res.json({
    status: "ok",
    message: "InstaVerse API is running"
  })
);

app.get("/api/health", (req, res) =>
  res.json({
    status: "ok",
    message: "InstaVerse backend is running"
  })
);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api", require("./routes/comments"));
app.use("/api", require("./routes/follows"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/notifications", require("./routes/notifications"));

app.use((req, res) =>
  res.status(404).json({
    error: "Route not found"
  })
);

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.status || 500).json({
    error: err.status === 400 ? "Invalid JSON" : "Server error"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`InstaVerse backend on port ${PORT}`);
});
