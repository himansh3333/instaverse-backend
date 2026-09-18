const express = require("express");
const pool = require("../db");
const auth = require("../middleware/auth");

const router = express.Router();

// Get messages of a conversation
router.get("/:conversationId", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         messages.*,
         users.username
       FROM messages
       JOIN users ON users.id = messages.sender_id
       WHERE conversation_id = $1
       ORDER BY messages.created_at ASC`,
      [req.params.conversationId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Unable to load messages"
    });
  }
});

// Send message
router.post("/:conversationId", auth, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Message cannot be empty"
      });
    }

    const result = await pool.query(
      `INSERT INTO messages
       (conversation_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        req.params.conversationId,
        req.user.id,
        content.trim()
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Message sending failed"
    });
  }
});

module.exports = router;
