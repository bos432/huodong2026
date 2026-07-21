export type GradeQuestion = { type: string; correctAnswer?: string[] | null; score: number };
export function normalizeAssessmentAnswer(value: unknown) { return (Array.isArray(value) ? value : value == null ? [] : [value]).map((item) => String(item)).sort(); }
export function gradeObjectiveQuestion(question: GradeQuestion, answer: unknown) {
  if (question.type === "essay") return { correct: null, score: 0, manual: true };
  const expected = normalizeAssessmentAnswer(question.correctAnswer);
  const actual = normalizeAssessmentAnswer(answer);
  const correct = expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  return { correct, score: correct ? Math.max(Number(question.score || 0), 0) : 0, manual: false };
}
export function assessmentPassed(totalScore: number, maximumScore: number, passScore: number) { return maximumScore > 0 && totalScore * 100 / maximumScore >= passScore; }
