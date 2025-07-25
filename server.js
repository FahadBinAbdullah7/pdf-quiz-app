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
app.use(express.static(path.join(__dirname, 'public')));

app.post('/generate-quiz', async (req, res) => {
  const { text, numQuestions } = req.body;

  const prompt = `Generate ${numQuestions} quiz questions from the following text. Format each question as:

title\timage\tthumbnail\tvideo\taudio\texplanation\texplanation_image\texplanation_video\texplanation_audio\toptions_1_answer\toptions_1_is_correct\toptions_1_image\toptions_1_audio\toptions_1_video\toptions_2_answer\toptions_2_is_correct\toptions_2_image\toptions_2_video\toptions_2_audio\toptions_3_answer\toptions_3_is_correct\toptions_3_image\toptions_3_video\toptions_3_audio\toptions_4_answer\toptions_4_is_correct

From text:
${text}`;

  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      { contents: [{ parts: [{ text: prompt }] }] },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
      }
    );

    // Check if the response contains the quiz data, otherwise return a failure message
    const quiz = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate quiz';
    
    // Format quiz data to handle null, true, false values (add this part if necessary)
    const formattedQuiz = formatQuizData(quiz);
    
    // Send the formatted quiz to the client
    res.json({ quiz: formattedQuiz });
  } catch (error) {
    // Enhanced error handling
    console.error("Error during API request:", error.message);
    if (error.response) {
      console.error("API Response Error:", error.response.data);
    }
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Function to format the quiz data (optional but recommended for handling null, false, true)
function formatQuizData(quizText) {
  const rows = quizText.trim().split('\n');

  const formattedRows = rows.map(row => {
    return row.split('\t').map(col => {
      // Convert 'false' to 0, 'true' to 1, 'null'/'undefined' to blank cell
      if (col === 'false') return '0';
      else if (col === 'true') return '1';
      else if (col === 'null' || col === 'undefined') return '';
      return col;
    }).join('\t');
  });

  return formattedRows.join('\n');
}

// Default route to serve the frontend HTML
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
