export type QuestionType = 'single_choice' | 'true_false_group' | 'short_answer';

export interface SectionConfig {
  id: string; // 'part_1', 'part_2', 'part_3'
  title: string;
  type: QuestionType;
  question_count: number;
  total_score: number; // Tổng điểm của phần này
  options?: string[];
  sub_items?: string[];
}

export interface ExamConfig {
  sections: SectionConfig[];
  p1_total_score?: number;
  p2_total_score?: number;
  p3_total_score?: number;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  pdf_url: string;
  config: ExamConfig;
  duration_minutes: number;
  is_active: boolean;
  teacher_name?: string;
  created_by?: string;
  start_at?: string | null; // ISO datetime
  end_at?: string | null;   // ISO datetime
  created_at: string;
}

export interface StudentAnswers {
  part_1?: Record<number, string>;
  part_2?: Record<number, Record<string, boolean>>;
  part_3?: Record<number, string>;
  timestamps?: {
    part_1?: Record<number, number>;
    part_2?: Record<number, Record<string, number>>;
    part_3?: Record<number, number>;
  };
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
  details: Record<string, boolean>;
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
