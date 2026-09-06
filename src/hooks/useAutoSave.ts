import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAutoSave(
  answers: any,
  examId: string,
  sessionToken: string,
  studentName: string,
  className: string,
  isSubmitted: boolean = false,
  studentId?: string | null
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const latestAnswers = useRef(answers);
  latestAnswers.current = answers;

  // 1. Luôn lưu LocalStorage tức thì (0ms)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (examId && sessionToken && !isSubmitted) {
      localStorage.setItem(`draft_${examId}_${sessionToken}`, JSON.stringify(answers));
    }
  }, [answers, examId, sessionToken, isSubmitted]);

  // 2. Đồng bộ ngầm lên Supabase (Debounce 5s)
  const syncToServer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (isSubmitted) return;

    const hasData = 
      Object.keys(latestAnswers.current?.part_1 || {}).length > 0 ||
      Object.keys(latestAnswers.current?.part_2 || {}).length > 0 ||
      Object.keys(latestAnswers.current?.part_3 || {}).length > 0;

    if (!hasData) return;

    timeoutRef.current = setTimeout(async () => {
      if (isSubmitted) return;

      try {
        await supabase.from('submissions').upsert({
          exam_id: examId,
          session_token: sessionToken,
          student_name: studentName,
          class_name: className,
          answers: latestAnswers.current,
          student_id: studentId || null,
          status: 'in_progress',
        }, { onConflict: 'exam_id,session_token' });
      } catch (err) {
        console.warn('Tạm mất kết nối mạng, bài làm vẫn được bảo vệ tại LocalStorage.');
      }
    }, 5000);
  }, [examId, sessionToken, studentName, className, isSubmitted, studentId]);

  useEffect(() => {
    if (isSubmitted) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    syncToServer();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [answers, isSubmitted, syncToServer]);
}
