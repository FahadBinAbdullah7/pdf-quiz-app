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

  // Fixed the multi-line string with template literals
  const prompt = `Generate ${numQuestions} quiz questions from the following text. Format each question as follows:

output all quiz data strictly in a markdown table with the following columns:

title, image, thumbnail, video, audio, explanation, explanation_image, explanation_video, explanation_audio,  
options_1_answer, options_1_is_correct, options_1_image, options_1_audio, options_1_video,  
options_2_answer, options_2_is_correct, options_2_image, options_2_video, options_2_audio,  
options_3_answer, options_3_is_correct, options_3_image, options_3_video, options_3_audio,  
options_4_answer, options_4_is_correct, options_4_image, options_4_video, options_4_audio.


Requirements for the output:  
The title column contains only the quiz questions
 Each quiz must have exactly 4 options.
The correct answer must be placed in the relevant options_X_answer cell, where X is the option number (1–4).
In the matching options_X_is_correct cell for the correct answer, write 1.
For all incorrect options, write 0 in their options_X_is_correct cells.
Only one option per question should have 1 in its _is_correct column.
All options_X_answer cells for incorrect options should still contain plausible but write 0 .

Leave the explanation, explanation_image, explanation_video, explanation_audio, and all media columns (image, thumbnail, video, audio, options_X_image, options_X_audio, options_X_video) blank.  
Use only the provided data to create questions and options—do not add any external information.  
Format the entire output strictly as a markdown table with the headers above.  
Do not include any text outside the markdown table in your final output.
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
