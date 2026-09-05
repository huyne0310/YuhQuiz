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

  // 1. Lưu LocalStorage: Chỉ ghi khi người dùng đã có thao tác hoặc có dữ liệu
  useEffect(() => {
    // Bỏ qua lần render đầu tiên nếu answers đang rỗng để tránh ghi đè dữ liệu đã có trong LocalStorage
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (examId && sessionToken) {
      localStorage.setItem(`draft_${examId}_${sessionToken}`, JSON.stringify(answers));
    }
  }, [answers, examId, sessionToken]);

  // 2. Đồng bộ ngầm lên Supabase (Debounce 3s)
  const syncToServer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Không đồng bộ payload rỗng
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
        console.warn('Đang tạm ngắt kết nối với máy chủ, dữ liệu vẫn an toàn tại LocalStorage.');
      }
    }, 3000);
  }, [examId, sessionToken, studentName, className]);

  useEffect(() => {
    syncToServer();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [answers, syncToServer]);
}
