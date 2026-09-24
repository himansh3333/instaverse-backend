const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all posts
router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id || 0;

    const result = await pool.query(
      `SELECT
        p.*,
        u.username,
        u.avatar_url,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id)::int AS likes_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id)::int AS comments_count,
        EXISTS(
          SELECT 1 FROM likes l
          WHERE l.post_id = p.id AND l.user_id = $1
        ) AS liked
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({
      posts: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to load posts"
    });
  }
});

// Create post
router.post("/", auth, async (req, res) => {
  try {
    const { image_url, caption } = req.body;

    if (!image_url) {
      return res.status(400).json({
        error: "Image URL is required"
      });
    }

    const result = await pool.query(
      `INSERT INTO posts (user_id, image_url, caption)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, image_url, caption || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Post creation failed"
    });
  }
});

// Like post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const postId = Number(req.params.id);

    const existing = await pool.query(
      `SELECT id FROM likes
       WHERE post_id = $1 AND user_id = $2`,
      [postId, req.user.id]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO likes (post_id, user_id)
         VALUES ($1, $2)`,
        [postId, req.user.id]
      );
    }

    const count = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM likes WHERE post_id = $1`,
      [postId]
    );

    res.json({
      liked: true,
      likes_count: count.rows[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Like failed"
    });
  }
});

// Unlike post
router.delete("/:id/like", auth, async (req, res) => {
  try {
    const postId = Number(req.params.id);

    await pool.query(
      `DELETE FROM likes
       WHERE post_id = $1 AND user_id = $2`,
      [postId, req.user.id]
    );

    const count = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM likes WHERE post_id = $1`,
      [postId]
    );

    res.json({
      liked: false,
      likes_count: count.rows[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unlike failed"
    });
  }
});

// Delete own post
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM posts
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Post not found"
      });
    }

    res.json({
      message: "Post deleted"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Post deletion failed"
    });
  }
});

module.exports = router;
