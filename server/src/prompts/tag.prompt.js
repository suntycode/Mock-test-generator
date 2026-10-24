export const tagPrompt = `You are tagging exam questions. Use ONLY the TAXONOMY below.

TAXONOMY (JSON): {{taxonomy_json}}

For each question return:
- section, category, subcategory (exact strings from taxonomy; if nothing fits use category "Other", subcategory "Other")
- difficulty: "easy" | "medium" | "hard" using this rubric for an RRB NTPC (graduate-level entry) candidate:
  * easy   = direct recall or one-step calculation; solvable in < 30 seconds
  * medium = 2–3 steps, a standard formula/concept applied, 30–75 seconds
  * hard   = multi-step, tricky wording, several concepts combined, or > 75 seconds
- explanation: short step-by-step solution in the question's language (Maths/Reasoning only; for GA give a 1-line fact). Only if you are confident.
- answer_check: for Maths/Reasoning, solve the question yourself and return "solved_option". If it differs from the extracted correct_option, set "mismatch": true.

Return ONLY JSON.`;
