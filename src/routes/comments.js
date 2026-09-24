const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get comments for a post
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        c.id,
        c.post_id,
        c.user_id,
        c.content,
        c.created_at,
        u.username,
        u.avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.postId]
    );

    res.json({
      comments: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load comments"
    });
  }
});

// Add comment
router.post("/posts/:postId/comments", auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty"
      });
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at`,
      [req.params.postId, req.user.id, content.trim()]
    );

    res.status(201).json({
      comment: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Comment failed"
    });
  }
});

// Delete own comment
router.delete("/posts/:postId/comments/:commentId", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM comments
       WHERE id = $1
       AND post_id = $2
       AND user_id = $3
       RETURNING id`,
      [
        req.params.commentId,
        req.params.postId,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Comment not found or you are not allowed to delete it"
      });
    }

    res.json({
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Comment deletion failed"
    });
  }
});

module.exports = router;
