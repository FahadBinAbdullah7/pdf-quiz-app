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

1. Each question should include the following fields:
   - title: The question
   - image: Blank cell
   - thumbnail: Blank cell
   - video: Blank cell
   - audio: Blank cell
   - explanation: A detailed explanation of the answer
   - explanation_image: Blank cell
   - explanation_video: Blank cell
   - explanation_audio: Blank cell

2. Each question should have four options (Option 1, Option 2, Option 3, Option 4):
   - options_1_answer: The answer for option 1
   - options_1_is_correct: Boolean value (true/false) indicating whether option 1 is correct (Convert true to 1 and false to 0)
   - options_1_image: Blank cell
   - options_1_audio: Blank cell
   - options_1_video: Blank cell
   - options_2_answer: The answer for option 2
   - options_2_is_correct: Boolean value (true/false) indicating whether option 2 is correct (Convert true to 1 and false to 0)
   - options_2_image: Blank cell
   - options_2_audio: Blank cell
   - options_2_video: Blank cell
   - options_3_answer: The answer for option 3
   - options_3_is_correct: Boolean value (true/false) indicating whether option 3 is correct (Convert true to 1 and false to 0)
   - options_3_image: Blank cell
   - options_3_audio: Blank cell
   - options_3_video: Blank cell
   - options_4_answer: The answer for option 4
   - options_4_is_correct: Boolean value (true/false) indicating whether option 4 is correct (Convert true to 1 and false to 0)

3. Each value in the above fields should be separated by a tab (\t) and each question should be separated by a newline (\n).

4. For any missing or unavailable data, replace it with null, undefined, or a blank cell, as applicable (for example, if there's no image or video, use an empty string).

5. Format the final output in tab-separated format for each question:
   - Example output format for one set of questions and this is the only header:
     question_title\timage_url\tthumbnail_url\tvideo_url\taudio_url\texplanation\texplanation_image\texplanation_video\texplanation_audio\toption_1_answer\toption_1_is_correct\toption_1_image\toption_1_audio\toption_1_video\toption_2_answer\toption_2_is_correct\toption_2_image\toption_2_video\toption_2_audio\toption_3_answer\toption_3_is_correct\toption_3_image\toption_3_video\toption_3_audio\toption_4_answer\toption_4_is_correct

From the text:
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
