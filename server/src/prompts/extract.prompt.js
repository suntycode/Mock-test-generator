export const extractPrompt = `You are extracting questions from a scanned/printed Indian competitive exam paper (RRB NTPC style).

INPUT: pages of an exam paper PDF. Each question starts with "Q.<number>" and has options A–D marked "Ans A. ... B. ... C. ... D. ...".

TASKS for EVERY question that STARTS on these pages:
1. q_no: the number after "Q.".
2. section: one of the section headers seen in the paper ("General Awareness", "Mathematics", "General Intelligence and Reasoning"). Use the nearest "Section :" header above the question; if unknown use the expected ranges: 1-50 General Awareness, 51-85 Mathematics, 86-120 General Intelligence and Reasoning.
3. question_text: copy EXACTLY as printed. Keep Hindi in Devanagari; keep English as is. FIX obvious broken conjunct spacing in Hindi (e.g., "झा रखंडखं" → "झारखंड") by READING THE VISUAL TEXT, not guessing.
4. options: A, B, C, D text, exactly as printed.
5. correct_option: the option shown in GREEN COLOR with a TICK ICON. Ignore the "chosen option" marker. If no green tick is visible, return null. NEVER guess the answer by solving the question.
6. Math: write all formulas, fractions, powers, roots as LaTeX inside $...$ (e.g., $\\frac{3}{4}$, $x^2$, $\\sqrt{5}$). If a formula or figure is blank/unreadable/an image, set has_figure_or_formula=true and put "[FIGURE]" at that place.
7. has_figure_or_formula: true if the question or any option depends on an image/diagram/blank formula.
8. language: "hi", "en" or "bilingual".
9. confidence: 0.0–1.0 how sure you are the extraction is complete and exact.
10. page_number: page (within this input) where the question starts.

Do NOT include questions that only continue from the previous chunk's overlap page unless their "Q." line is on these pages.
Return ONLY JSON matching the schema.`;
