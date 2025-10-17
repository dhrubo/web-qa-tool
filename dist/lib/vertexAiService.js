"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeImages = analyzeImages;
const vertexai_1 = require("@google-cloud/vertexai");
const fs_1 = __importDefault(require("fs"));
function analyzeImages(image1_path, image2_path) {
    return __awaiter(this, void 0, void 0, function* () {
        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION;
        const vertex_ai = new vertexai_1.VertexAI({ project: project, location: location });
        const generativeVisionModel = vertex_ai.getGenerativeModel({
            model: 'gemini-1.5-pro-latest',
        });
        const image1 = {
            inlineData: {
                mimeType: 'image/png',
                data: fs_1.default.readFileSync(image1_path).toString('base64'),
            },
        };
        const image2 = {
            inlineData: {
                mimeType: 'image/png',
                data: fs_1.default.readFileSync(image2_path).toString('base64'),
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
        const response = yield generativeVisionModel.generateContent(request);
        if (response.response.candidates && response.response.candidates[0].content.parts[0].text) {
            return response.response.candidates[0].content.parts[0].text;
        }
        return '';
    });
}
