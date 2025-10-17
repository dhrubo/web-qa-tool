import { VertexAI } from '@google-cloud/vertexai';
import fs from 'fs';

export async function analyzeImages(image1_path: string, image2_path: string): Promise<string> {
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION;

  const vertex_ai = new VertexAI({ project: project, location: location });

  const generativeVisionModel = vertex_ai.getGenerativeModel({
    model: 'gemini-1.5-pro-latest',
  });

  const image1 = {
    inlineData: {
      mimeType: 'image/png',
      data: fs.readFileSync(image1_path).toString('base64'),
    },
  };

  const image2 = {
    inlineData: {
      mimeType: 'image/png',
      data: fs.readFileSync(image2_path).toString('base64'),
    },
  };

  const request = {
    contents: [
      {
        role: 'user',
        parts: [image1, { text: 'What is in this image?' }, image2, { text: 'What is in this image?' }],
      },
    ],
  };

  const response = await generativeVisionModel.generateContent(request);
  if (response.response.candidates && response.response.candidates[0].content.parts[0].text) {
    return response.response.candidates[0].content.parts[0].text;
  }
  return '';
}