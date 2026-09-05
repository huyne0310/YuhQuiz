export type QuestionType = 'single_choice' | 'true_false_group' | 'short_answer';

export interface SectionConfig {
  id: string; // 'part_1', 'part_2', 'part_3'
  title: string;
  type: QuestionType;
  question_count: number;
  options?: string[]; // ['A', 'B', 'C', 'D']
  sub_items?: string[]; // ['a', 'b', 'c', 'd']
  points_per_question?: number;
}

export interface ExamConfig {
  sections: SectionConfig[];
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  pdf_url: string;
  config: ExamConfig;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface StudentAnswers {
  part_1?: Record<number, string>; // { 1: "A", 2: "C" }
  part_2?: Record<number, Record<string, boolean>>; // { 1: { a: true, b: false, c: false, d: true } }
  part_3?: Record<number, string>; // { 1: "1.5", 2: "1.5" }
}

export interface Part1ScoreDetail {
  is_correct: boolean;
  score: number;
  student_ans: string;
  key: string;
}

export interface Part2ScoreDetail {
  correct_count: number;
  score: number;
  details: Record<string, boolean>; // a: true, b: false...
}

export interface Part3ScoreDetail {
  is_correct: boolean;
  score: number;
  student_ans: string;
  key: string;
}

export interface ScoreDetails {
  part_1?: Record<number, Part1ScoreDetail>;
  part_2?: Record<number, Part2ScoreDetail>;
  part_3?: Record<number, Part3ScoreDetail>;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_name: string;
  class_name: string;
  session_token: string;
  answers: StudentAnswers;
  score: number | null;
  score_details: ScoreDetails;
  cheat_count: number;
  total_away_seconds: number;
  status: 'in_progress' | 'submitted';
  started_at: string;
  submitted_at: string | null;
}
