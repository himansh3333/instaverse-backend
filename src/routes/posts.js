const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all posts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        posts.*,
        users.username,
        users.avatar_url
      FROM posts
      JOIN users ON users.id = posts.user_id
      ORDER BY posts.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load posts"
    });
  }
});

// Create post
router.post("/", auth, async (req, res) => {
  try {
    const { image_url, caption } = req.body;

    if (!image_url) {
      return res.status(400).json({
        message: "Image URL is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO posts
       (user_id, image_url, caption)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, image_url, caption || ""]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Post creation failed"
    });
  }
});

// Like post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const postId = req.params.id;

    const existing = await pool.query(
      `SELECT id FROM likes
       WHERE post_id = $1 AND user_id = $2`,
      [postId, req.user.id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
        [postId, req.user.id]
      );

      return res.json({ liked: false });
    }

    await pool.query(
      `INSERT INTO likes (post_id, user_id)
       VALUES ($1, $2)`,
      [postId, req.user.id]
    );

    res.json({ liked: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Like failed"
    });
  }
});

module.exports = router;
