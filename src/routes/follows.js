const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Follow a user
router.post("/users/:id/follow", auth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId)) {
      return res.status(400).json({
        message: "Invalid user ID"
      });
    }

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({
        message: "You cannot follow yourself"
      });
    }

    const user = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [targetId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const existing = await pool.query(
      `SELECT id FROM follows
       WHERE follower_id = $1 AND following_id = $2`,
      [req.user.id, targetId]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `DELETE FROM follows
         WHERE follower_id = $1 AND following_id = $2`,
        [req.user.id, targetId]
      );

      return res.json({
        following: false
      });
    }

    await pool.query(
      `INSERT INTO follows (follower_id, following_id)
       VALUES ($1, $2)`,
      [req.user.id, targetId]
    );

    res.json({
      following: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Follow operation failed"
    });
  }
});

// Get followers
router.get("/users/:id/followers", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = $1
       ORDER BY u.username`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load followers"
    });
  }
});

// Get following
router.get("/users/:id/following", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.avatar_url
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = $1
       ORDER BY u.username`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load following"
    });
  }
});

module.exports = router;
