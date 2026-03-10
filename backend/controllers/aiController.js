const axios = require('axios');

// @desc    Chat with AI
// @route   POST /api/ai/chat
// @access  Private
exports.chat = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `You are an AI assistant for MIT-Learn, a Learning Management System. Help users with questions about courses, assignments, and learning. Be helpful and concise. User question: ${message}`
                    }]
                }]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const aiResponse = response.data.candidates[0].content.parts[0].text;

        res.json({
            success: true,
            response: aiResponse
        });
    } catch (error) {
        console.error('AI chat error:', error);
        res.status(500).json({ 
            error: 'Failed to get AI response', 
            message: error.message 
        });
    }
};