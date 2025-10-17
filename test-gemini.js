require('dotenv').config({ path: '.env.local' });

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  // Initialize the GoogleGenerativeAI with your API key
  const genAI = new GoogleGenerativeAI(process.env.VERTEX_AI_API_KEY);

  // Get the generative model
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  // Generate content
  const prompt = "What is the capital of France?";
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  console.log(text);
}

run();
