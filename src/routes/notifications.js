const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get logged-in user's notifications
router.get("/", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        n.id,
        n.type,
        n.post_id,
        n.is_read,
        n.created_at,
        u.id AS actor_id,
        u.username AS actor_username,
        u.avatar_url AS actor_avatar
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );

   const unreadResult = await pool.query(
  `SELECT COUNT(*)::int AS count
   FROM notifications
   WHERE user_id = $1 AND is_read = FALSE`,
  [req.user.id]
);

res.json({
  notifications: result.rows.map((n) => ({
    id: n.id,
    type: n.type,
    post_id: n.post_id,
    is_read: n.is_read,
    created_at: n.created_at,
    actor_id: n.actor_id,
    actor: n.actor_username,
    actor_avatar: n.actor_avatar
  })),
  unread: unreadResult.rows[0].count
});
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load notifications"
    });
  }
});

// Mark all notifications as read
router.put("/read", auth, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      message: "Notifications marked as read"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to update notifications"
    });
  }
});

module.exports = router;
