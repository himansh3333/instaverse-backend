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
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id)::int AS posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id)::int AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::int AS following_count
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to load user"
    });
  }
});

// Update logged-in user's profile
router.put("/me", auth, async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const bio = String(req.body.bio || "").trim().slice(0, 200);

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      return res.status(400).json({
        error: "Username: 3-30 letters, numbers or underscore"
      });
    }

    const existing = await pool.query(
      `SELECT id FROM users
       WHERE username = $1 AND id <> $2`,
      [username, req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: "Username already taken"
      });
    }

    await pool.query(
      `UPDATE users
       SET username = $1, bio = $2
       WHERE id = $3`,
      [username, bio, req.user.id]
    );

    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.email,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id)::int AS posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id)::int AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::int AS following_count
       FROM users u
       WHERE u.id = $1`,
      [req.user.id]
    );

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to update profile"
    });
  }
});

// Search users
router.get("/search", auth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        users: []
      });
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.bio,
        u.avatar_url,
        EXISTS(
          SELECT 1
          FROM follows
          WHERE follower_id = $2
          AND following_id = u.id
        ) AS is_following
       FROM users u
       WHERE u.username ILIKE $1
       AND u.id <> $2
       ORDER BY u.username
       LIMIT 20`,
      [`%${q}%`, req.user.id]
    );

    res.json({
      users: result.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Search failed"
    });
  }
});

// Get any user's profile
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        error: "Invalid user id"
      });
    }

    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.email,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id)::int AS posts_count,
        (SELECT COUNT(*) FROM follows WHERE following_id = u.id)::int AS followers_count,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id)::int AS following_count,
        EXISTS(
          SELECT 1
          FROM follows
          WHERE follower_id = $2
          AND following_id = u.id
        ) AS is_following
       FROM users u
       WHERE u.id = $1`,
      [userId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Unable to load user"
    });
  }
});

// Follow / unfollow
router.post("/:id/follow", auth, async (req, res) => {
  try {
    const targetId = Number(req.params.id);

    if (!Number.isInteger(targetId)) {
      return res.status(400).json({
        error: "Invalid user id"
      });
    }

    if (targetId === Number(req.user.id)) {
      return res.status(400).json({
        error: "You cannot follow yourself"
      });
    }

    const user = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [targetId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
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
      error: "Follow operation failed"
    });
  }
});

module.exports = router;
