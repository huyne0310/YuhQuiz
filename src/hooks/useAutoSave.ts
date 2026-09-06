import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAutoSave(
  answers: any,
  examId: string,
  sessionToken: string,
  studentName: string,
  className: string
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);
  const latestAnswers = useRef(answers);
  latestAnswers.current = answers;

  // 1. Luôn lưu LocalStorage tức thì (0ms) - Chống mất bài kể cả khi F5 ngay lập tức
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (examId && sessionToken) {
      localStorage.setItem(`draft_${examId}_${sessionToken}`, JSON.stringify(answers));
    }
  }, [answers, examId, sessionToken]);

  // 2. Đồng bộ ngầm lên Supabase (Debounce 5s để tối ưu Quota Free Tier)
  const syncToServer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const hasData = 
      Object.keys(latestAnswers.current.part_1 || {}).length > 0 ||
      Object.keys(latestAnswers.current.part_2 || {}).length > 0 ||
      Object.keys(latestAnswers.current.part_3 || {}).length > 0;

    if (!hasData) return;

    timeoutRef.current = setTimeout(async () => {
      try {
        await supabase.from('submissions').upsert({
          exam_id: examId,
          session_token: sessionToken,
          student_name: studentName,
          class_name: className,
          answers: latestAnswers.current,
          status: 'in_progress',
        }, { onConflict: 'exam_id,session_token' });
      } catch (err) {
        console.warn('Tạm mất kết nối, bài làm vẫn được bảo vệ tại LocalStorage.');
      }
    }, 5000);
  }, [examId, sessionToken, studentName, className]);

  useEffect(() => {
    syncToServer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [answers, syncToServer]);
}
