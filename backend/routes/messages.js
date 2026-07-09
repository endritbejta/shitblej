const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const { protect } = require("../middleware/auth");

// POST - Send a new message
router.post("/", protect, async (req, res) => {
  try {
    const { sender, receiver, text } = req.body;

    if (!sender || !receiver || !text) {
      return res.status(400).json({ 
        success: false, 
        error: "sender, receiver, and text are required" 
      });
    }

    const message = await Message.create({
      sender,
      receiver,
      text
    });

    res.status(201).json({ 
      success: true, 
      data: message 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: "Server Error" 
    });
  }
});

// GET - Get all conversations for the current user
router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user.id; // From protect middleware

    // Get all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
      .populate('sender', 'name image')
      .populate('receiver', 'name image')
      .sort({ createdAt: -1 });

    // Group by conversation partner and get last message
    const conversationsMap = new Map();
    
    messages.forEach(msg => {
      const partnerId = msg.sender._id.toString() === userId 
        ? msg.receiver._id.toString() 
        : msg.sender._id.toString();
      
      if (!conversationsMap.has(partnerId)) {
        const partner = msg.sender._id.toString() === userId 
          ? msg.receiver 
          : msg.sender;
        
        conversationsMap.set(partnerId, {
          id: partner._id,
          name: partner.name,
          avatar: partner.image || "https://via.placeholder.com/150",
          lastMessage: msg.text,
          time: msg.createdAt
        });
      }
    });

    const conversations = Array.from(conversationsMap.values());
    
    res.status(200).json({ 
      success: true, 
      count: conversations.length, 
      data: conversations 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      success: false, 
      error: "Server Error" 
    });
  }
});

// Get messages between current user and another user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentUserId } = req.query;

    if (!currentUserId) {
        return res.status(400).json({ success: false, error: "currentUserId query param is required" });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

module.exports = router;

