import OpenAI from "openai";
import { EXPO_PUBLIC_OPENAI_API_KEY } from "@env";

if (!EXPO_PUBLIC_OPENAI_API_KEY) {
  throw new Error("OpenAI API key is not set in environment variables");
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: EXPO_PUBLIC_OPENAI_API_KEY,
});

interface SolutionResult {
  steps: string[];
  finalAnswer: string;
  originalEquation: string;
}

export async function analyzeAndSolveEquation(
  base64Image: string
): Promise<SolutionResult> {
  try {
    console.log("Starting analyzeAndSolveEquation...");
    // First, use GPT-4 Vision to analyze the image and extract the equation
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This image contains a mathematical equation. Please extract and return ONLY the equation in LaTeX format, nothing else. For example, if you see 'y² = 16', return '$y^2 = 16$'.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const equation = visionResponse.choices[0]?.message?.content || "";
    console.log("Raw equation from vision:", equation);

    // Clean up the equation: remove double $$ and ensure single $, trim whitespace
    const cleanedEquation = equation
      .trim()
      .replace(/\$\$/g, "$")
      .replace(/^\$|\$$/g, "")
      .trim();
    const formattedEquation = `$${cleanedEquation}$`;
    console.log("Formatted equation:", formattedEquation);

    // Now, use GPT-4 to solve the equation step by step with detailed explanations
    const solutionResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a clear and concise math tutor. When solving equations:
1. Break the solution into short, clear steps
2. For each step:
   - Use 1-2 short sentences to explain the concept
   - Show the equation
   - Keep explanations brief but clear
3. Use LaTeX formatting for equations (enclosed in $ signs)
4. When using special symbols like ±, use proper LaTeX notation (\\pm)
5. Format your response in this exact structure:

STEP 1: [One clear sentence about what we're doing] $[equation]$

STEP 2: [One clear sentence about what we're doing] $[equation]$
...
FINAL ANSWER: [Brief explanation] $[answer]$

Example of good explanation:
"STEP 1: Apply the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$"`,
        },
        {
          role: "user",
          content: `Please solve this equation step by step: ${formattedEquation}`,
        },
      ],
      max_tokens: 1000,
    });

    const solution = solutionResponse.choices[0]?.message?.content || "";
    console.log("Raw solution response:", solution);

    // Parse the solution into steps and final answer
    const steps: string[] = [];
    const lines = solution.split("\n").filter((line) => line.trim().length > 0);
    let currentStep = "";
    let finalAnswer = "";
    let isCollectingFinalAnswer = false;
    let isInitialExplanation = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith("STEP")) {
        isInitialExplanation = false;
        if (currentStep) {
          if (!isCollectingFinalAnswer) {
            steps.push(currentStep.trim());
          }
        }
        currentStep = line.split(": ")[1];
        isCollectingFinalAnswer = false;
      } else if (line.startsWith("FINAL")) {
        isInitialExplanation = false;
        if (currentStep && !isCollectingFinalAnswer) {
          steps.push(currentStep.trim());
        }
        currentStep = "";
        finalAnswer = line.split(": ")[1];
        isCollectingFinalAnswer = true;
      } else if (line && !line.startsWith("Example")) {
        const shouldAddNewline = line.includes("$") ? " " : " ";
        if (isInitialExplanation) {
          if (!currentStep) {
            currentStep = "Initial Analysis: " + line;
          } else {
            currentStep += shouldAddNewline + line;
          }
        } else if (isCollectingFinalAnswer) {
          finalAnswer += shouldAddNewline + line;
        } else {
          currentStep += shouldAddNewline + line;
        }
      }
    }

    // Add the last step if it exists and wasn't added
    if (currentStep && !isCollectingFinalAnswer) {
      steps.push(currentStep.trim());
    }

    // If no final answer was found, use the last collected text
    if (!finalAnswer && currentStep) {
      finalAnswer = currentStep.trim();
    }

    // If still no final answer, use default message
    if (!finalAnswer) {
      finalAnswer = "No solution found";
    }

    const result = {
      steps,
      finalAnswer: finalAnswer.trim(),
      originalEquation: formattedEquation,
    };

    console.log("Final parsed result:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("Error in analyzeAndSolveEquation:", error);
    throw new Error("Failed to analyze and solve equation");
  }
}

export async function extractEquationFromImage(
  base64Image: string
): Promise<string> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This image contains a mathematical equation. Please extract and return ONLY the equation in LaTeX format, nothing else. For example, if you see 'y² = 16', return '$y^2 = 16$'.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    const equation = visionResponse.choices[0]?.message?.content || "";
    // Clean up the equation: remove double $$ and ensure single $, trim whitespace
    const cleanedEquation = equation
      .trim()
      .replace(/\$\$/g, "$")
      .replace(/^\$|\$$/g, "")
      .trim();
    console.log("Extracted equation:", cleanedEquation);
    return `$${cleanedEquation}$`;
  } catch (error) {
    console.error("Error extracting equation:", error);
    throw new Error("Failed to extract equation from image");
  }
}
