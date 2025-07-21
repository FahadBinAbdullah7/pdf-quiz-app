require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

app.post('/generate-quiz', async (req, res) => {
  const { text, numQuestions } = req.body;

  if (!text || !numQuestions) {
    return res.status(400).json({ error: 'Missing text or numQuestions' });
  }

  const prompt = `Generate ${numQuestions} quiz questions from the following text. Format each question as:

title\timage\tthumbnail\tvideo\taudio\texplanation\texplanation_image\texplanation_video\texplanation_audio\toptions_1_answer\toptions_1_is_correct\toptions_1_image\toptions_1_audio\toptions_1_video\toptions_2_answer\toptions_2_is_correct\toptions_2_image\toptions_2_video\toptions_2_audio\toptions_3_answer\toptions_3_is_correct\toptions_3_image\toptions_3_video\toptions_3_audio\toptions_4_answer\toptions_4_is_correct

Text:
${text}`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent',
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
      }
    );

    const quizText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate quiz';
    res.json({ quiz: quizText });

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate quiz from Gemini API' });
  }
});

// Fallback to serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
