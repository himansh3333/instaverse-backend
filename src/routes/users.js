const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get logged-in user's profile
router.get("/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.email,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id)::int AS post_count,
        (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id)::int AS follower_count,
        (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id)::int AS following_count
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load user"
    });
  }
});

// Get any user's profile
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, bio, avatar_url, created_at
       FROM users
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load user"
    });
  }
});

// Follow / unfollow user
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const targetId = req.params.id;

    if (Number(targetId) === Number(req.user.id)) {
      return res.status(400).json({
        message: "You cannot follow yourself"
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

module.exports = router;
