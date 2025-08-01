// File: solve.ts
// This script solves the Shamir's Secret Sharing problem from the hackathon.
// It reads points from a JSON file, decodes Y values from different bases,
// and uses Lagrange Interpolation with BigInts to find the secret f(0).

import * as fs from 'fs';

// --- TYPE DEFINITIONS ---
// Represents a single point (x, y) on the polynomial.
// We use BigInt to handle potentially massive numbers.
interface Point {
  x: bigint;
  y: bigint;
}

// Represents the structure of the input JSON file.
interface TestCase {
  keys: {
    n: number;
    k: number;
  };
  [key: string]: any;
}


// --- CORE FUNCTIONS ---

/**
 * Parses a string value from any base (2-36) into a BigInt.
 * This is necessary because BigInt() doesn't natively support all bases.
 * @param value The string value to parse (e.g., "111", "aed70").
 * @param base The numerical base to use for parsing (e.g., 2, 15).
 * @returns The parsed value as a BigInt.
 */
function parseBigIntWithBase(value: string, base: number): bigint {
  const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
  let result = 0n;
  const baseBigInt = BigInt(base);
  for (let i = 0; i < value.length; i++) {
    const char = value[i].toLowerCase();
    const digitValue = digits.indexOf(char);
    if (digitValue === -1 || digitValue >= base) {
      throw new Error(`Invalid character '${char}' for base ${base}`);
    }
    result = result * baseBigInt + BigInt(digitValue);
  }
  return result;
}

/**
 * Reads the test case JSON and decodes the points.
 * @param data The parsed JSON data from the test case file.
 * @returns An array of Point objects.
 */
function getPointsFromJSON(data: TestCase): Point[] {
  const points: Point[] = [];
  for (const key in data) {
    // Skip the "keys" object, process only the numbered points.
    if (key !== 'keys') {
      const x = BigInt(key);
      const base = parseInt(data[key].base, 10);
      const value = data[key].value;
      
      const y = parseBigIntWithBase(value, base);
      points.push({ x, y });
    }
  }
  return points;
}

/**
 * Uses Lagrange Interpolation to find the value of the polynomial at x=0.
 * This value, f(0), is the secret 'c'.
 * All calculations are done using BigInt to prevent precision loss.
 * @param points An array of k points to use for the calculation.
 * @returns The secret value 'c' as a BigInt.
 */
function findSecret(points: Point[]): bigint {
  let secret = 0n;

  // The formula for f(0) is: Σ y_j * L_j(0)
  // where L_j(0) is the Lagrange basis polynomial.
  for (let j = 0; j < points.length; j++) {
    const currentPoint = points[j];
    let numerator = 1n;
    let denominator = 1n;

    // CORRECTED LOGIC: Calculate L_j(0) which is: Π (0 - x_m) / (x_j - x_m) for m != j
    for (let m = 0; m < points.length; m++) {
      if (j !== m) {
        const otherPoint = points[m];
        // Numerator part: (0 - x_m) is just -x_m
        numerator *= (0n - otherPoint.x);
        // Denominator part: (x_j - x_m)
        denominator *= (currentPoint.x - otherPoint.x);
      }
    }
    
    // The problem setup ensures this division will result in a whole number.
    // The key is to do all multiplications first, then the final division.
    const term = (currentPoint.y * numerator) / denominator;
    secret += term;
  }

  return secret;
}

// --- MAIN EXECUTION ---
function main() {
  // Read the JSON file path from the command line arguments.
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Please provide the path to the test case JSON file.");
    console.error("Usage: npx ts-node solve.ts <path_to_file>");
    return;
  }

  try {
    // 1. Read the Test Case (Input)
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const testCase: TestCase = JSON.parse(fileContent);

    const k = testCase.keys.k;

    // 2. Decode the Y Values
    const allPoints = getPointsFromJSON(testCase);
    
    // We only need 'k' points to solve for the polynomial.
    const pointsToUse = allPoints.slice(0, k);

    console.log(`Using ${k} points for interpolation:`);
    pointsToUse.forEach(p => console.log(`  (x=${p.x}, y=${p.y})`));

    // 3. Find the Secret (C)
    const secret = findSecret(pointsToUse);

    console.log("\n--------------------");
    console.log("Secret (c) Found:");
    console.log(secret.toString());
    console.log("--------------------");

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Run the main function.
main();