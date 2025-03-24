import OpenAI from "openai";
import { EXPO_PUBLIC_OPENAI_API_KEY } from "@env";
import NetInfo from "@react-native-community/netinfo";

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

export class MathMateError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "MathMateError";
  }
}

async function checkInternetConnection() {
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    throw new MathMateError("No internet connection", "NO_INTERNET");
  }
}

export async function analyzeAndSolveEquation(
  base64Image: string
): Promise<SolutionResult> {
  try {
    await checkInternetConnection();
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
              text: "This image contains a mathematical equation. Please extract and return ONLY the equation in LaTeX format, nothing else. For example, if you see 'y² = 16', return '$y^2 = 16$'. If you cannot see a clear equation in the image, return 'NO_EQUATION_FOUND'.",
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
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    if (!visionResponse.choices[0]?.message?.content) {
      throw new MathMateError(
        "Failed to extract equation from image",
        "EXTRACTION_FAILED"
      );
    }

    const equation = visionResponse.choices[0].message.content;
    console.log("Raw equation from vision:", equation);

    // Check for extraction failure phrases
    if (
      equation.includes("NO_EQUATION_FOUND") ||
      equation.toLowerCase().includes("cannot see") ||
      equation.toLowerCase().includes("no equation") ||
      equation.toLowerCase().includes("unclear") ||
      equation.toLowerCase().includes("not visible")
    ) {
      throw new MathMateError(
        "Could not find a clear equation in the image. Please try taking a clearer picture.",
        "EXTRACTION_FAILED"
      );
    }

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
          content: `You are a clear and concise math tutor. When solving problems:
1. Break the solution into short, clear steps
2. For each step:
   - Use 1-2 short sentences to explain the concept
   - Show the equation
   - Keep explanations brief but clear
3. Use LaTeX formatting for equations (enclosed in $ signs)
4. When using special symbols:
   - Use proper LaTeX notation (\\pm for ±, \\int for ∫, \\frac for fractions)
   - For integrals, use proper spacing with \\, before dx
   - For integrals, use proper limits with _{a}^{b} for definite integrals
5. Format your response in this exact structure:

STEP 1: [One clear sentence about what we're doing] $[equation]$

STEP 2: [One clear sentence about what we're doing] $[equation]$
...
FINAL ANSWER: [Brief explanation] $[answer]$

Example of good explanation:
"STEP 1: Apply the quadratic formula $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$"
"STEP 1: Evaluate the integral $\\int (3x^2 - 4x + 5) \\, dx$"`,
        },
        {
          role: "user",
          content: `Please solve this problem step by step: ${formattedEquation}`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    if (!solutionResponse.choices[0]?.message?.content) {
      throw new MathMateError("Failed to generate solution", "SOLUTION_FAILED");
    }

    const solution = solutionResponse.choices[0].message.content;
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
      throw new MathMateError(
        "Could not generate a valid solution",
        "INVALID_SOLUTION"
      );
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
    if (error instanceof MathMateError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes("401")) {
        throw new MathMateError("Invalid API key", "INVALID_API_KEY");
      }
      if (error.message.includes("429")) {
        throw new MathMateError("Rate limit exceeded", "RATE_LIMIT");
      }
      if (error.message.includes("network")) {
        throw new MathMateError("Network error", "NETWORK_ERROR");
      }
    }
    throw new MathMateError(
      "Failed to analyze and solve equation",
      "UNKNOWN_ERROR"
    );
  }
}

export async function extractEquationFromImage(
  base64Image: string
): Promise<string> {
  try {
    await checkInternetConnection();
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "This image contains a mathematical equation. Please extract and return ONLY the equation in LaTeX format, nothing else. For example, if you see 'y² = 16', return '$y^2 = 16$'. If you cannot see a clear equation in the image, return 'NO_EQUATION_FOUND'.",
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

    if (!visionResponse.choices[0]?.message?.content) {
      throw new MathMateError(
        "Failed to extract equation from image",
        "EXTRACTION_FAILED"
      );
    }

    const equation = visionResponse.choices[0].message.content;

    // Check for extraction failure phrases
    if (
      equation.includes("NO_EQUATION_FOUND") ||
      equation.toLowerCase().includes("cannot see") ||
      equation.toLowerCase().includes("no equation") ||
      equation.toLowerCase().includes("unclear") ||
      equation.toLowerCase().includes("not visible")
    ) {
      throw new MathMateError(
        "Could not find a clear equation in the image. Please try taking a clearer picture.",
        "EXTRACTION_FAILED"
      );
    }

    // Clean up the equation: remove all types of LaTeX delimiters and ensure single $
    const cleanedEquation = equation
      .trim()
      .replace(/\$\$/g, "$")
      .replace(/^\$|\$$/g, "")
      .trim();

    console.log("Extracted equation:", cleanedEquation);
    return `$${cleanedEquation}$`;
  } catch (error) {
    console.error("Error extracting equation:", error);
    if (error instanceof MathMateError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.message.includes("401")) {
        throw new MathMateError("Invalid API key", "INVALID_API_KEY");
      }
      if (error.message.includes("429")) {
        throw new MathMateError("Rate limit exceeded", "RATE_LIMIT");
      }
      if (error.message.includes("network")) {
        throw new MathMateError("Network error", "NETWORK_ERROR");
      }
    }
    throw new MathMateError(
      "Failed to extract equation from image",
      "UNKNOWN_ERROR"
    );
  }
}
