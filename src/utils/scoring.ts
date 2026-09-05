import { ExamConfig, StudentAnswers, ScoreDetails } from '../types/exam';

/**
 * Quy đổi điểm lũy tiến Phần II theo quy chế Bộ Giáo dục & Đào tạo từ năm 2025
 */
export const TF_PROGRESSIVE_POINTS: Record<number, number> = {
  0: 0.0,
  1: 0.1,
  2: 0.25,
  3: 0.5,
  4: 1.0,
};

/**
 * Chuẩn hóa chuỗi số cho Phần III (Trả lời ngắn)
 * Xử lý: dấu phẩy sang dấu chấm, khoảng trắng thừa, dấu + ở đầu.
 */
export function normalizeShortAnswer(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/\s+/g, '')
    .replace(',', '.')
    .replace(/^\+/, '');
}

/**
 * So khớp đáp án ngắn
 */
export function matchShortAnswer(
  studentInput: string | undefined | null,
  correctKey: string | undefined | null
): boolean {
  if (!studentInput || !correctKey) return false;

  const cleanInput = normalizeShortAnswer(studentInput);
  const cleanKey = normalizeShortAnswer(correctKey);

  if (cleanInput === cleanKey) return true;

  const numInput = Number(cleanInput);
  const numKey = Number(cleanKey);

  if (!isNaN(numInput) && !isNaN(numKey)) {
    return Math.abs(numInput - numKey) < 1e-6;
  }

  return false;
}

/**
 * Thuật toán chấm điểm hoàn chỉnh theo chuẩn THPTQG 2025
 */
export function calculateExamScore(
  answers: StudentAnswers,
  keys: any,
  config?: ExamConfig
): {
  totalScore: number;
  maxScore: number;
  scoreDetails: ScoreDetails;
} {
  let totalScore = 0;
  let maxScore = 0;
  const scoreDetails: ScoreDetails = {
    part_1: {},
    part_2: {},
    part_3: {},
  };

  // Xác định số lượng câu hỏi từ config hoặc mặc định chuẩn Toán 2025
  const p1Count = config?.sections.find(s => s.id === 'part_1')?.question_count ?? 12;
  const p2Count = config?.sections.find(s => s.id === 'part_2')?.question_count ?? 4;
  const p3Count = config?.sections.find(s => s.id === 'part_3')?.question_count ?? 6;

  // 1. Chấm Phần I (Trắc nghiệm 4 lựa chọn - 0.25đ / câu)
  for (let i = 1; i <= p1Count; i++) {
    const studentAns = answers.part_1?.[i]?.trim().toUpperCase() || '';
    const correctAns = keys.part_1?.[i]?.trim().toUpperCase() || '';
    const isCorrect = Boolean(studentAns && studentAns === correctAns);
    const score = isCorrect ? 0.25 : 0;

    scoreDetails.part_1![i] = {
      is_correct: isCorrect,
      score,
      student_ans: studentAns,
      key: correctAns,
    };

    if (isCorrect) totalScore += score;
    maxScore += 0.25;
  }

  // 2. Chấm Phần II (Trắc nghiệm Đúng / Sai - Lũy tiến 0.1, 0.25, 0.5, 1.0)
  for (let i = 1; i <= p2Count; i++) {
    const studentGroup = answers.part_2?.[i] || {};
    const keyGroup = keys.part_2?.[i] || {};
    const subItems = ['a', 'b', 'c', 'd'];

    let correctCount = 0;
    const subDetails: Record<string, boolean> = {};

    for (const sub of subItems) {
      const studentVal = studentGroup[sub];
      const keyVal = keyGroup[sub];
      const isCorrect = studentVal !== undefined && Boolean(studentVal) === Boolean(keyVal);
      subDetails[sub] = isCorrect;
      if (isCorrect) correctCount++;
    }

    const scoreEarned = TF_PROGRESSIVE_POINTS[correctCount] ?? 0;
    scoreDetails.part_2![i] = {
      correct_count: correctCount,
      score: scoreEarned,
      details: subDetails,
    };

    totalScore += scoreEarned;
    maxScore += 1.0;
  }

  // 3. Chấm Phần III (Trả lời ngắn - 0.5đ / câu)
  for (let i = 1; i <= p3Count; i++) {
    const studentAns = answers.part_3?.[i] || '';
    const correctAns = keys.part_3?.[i] || '';
    const isCorrect = matchShortAnswer(studentAns, correctAns);
    const score = isCorrect ? 0.5 : 0;

    scoreDetails.part_3![i] = {
      is_correct: isCorrect,
      score,
      student_ans: studentAns,
      key: correctAns,
    };

    if (isCorrect) totalScore += score;
    maxScore += 0.5;
  }

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxScore: Math.round(maxScore * 100) / 100,
    scoreDetails,
  };
}
