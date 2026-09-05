import { useState, useEffect, useRef } from 'react';

export function useExamTimer(
  durationMinutes: number,
  sessionKey: string,
  onTimeOut: () => void,
  isSubmitted: boolean = false
) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    const savedExpire = localStorage.getItem(`expire_${sessionKey}`);
    if (savedExpire) {
      const remaining = Math.floor((parseInt(savedExpire, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    const newExpire = Date.now() + durationMinutes * 60 * 1000;
    localStorage.setItem(`expire_${sessionKey}`, newExpire.toString());
    return durationMinutes * 60;
  });

  const onTimeOutRef = useRef(onTimeOut);
  onTimeOutRef.current = onTimeOut;

  useEffect(() => {
    // Dừng đồng hồ ngay lập tức khi học sinh đã nộp bài
    if (isSubmitted) {
      return;
    }

    if (secondsRemaining <= 0) {
      onTimeOutRef.current();
      return;
    }

    const interval = setInterval(() => {
      const savedExpire = localStorage.getItem(`expire_${sessionKey}`);
      if (!savedExpire) return;

      const diff = Math.floor((parseInt(savedExpire, 10) - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsRemaining(0);
        clearInterval(interval);
        onTimeOutRef.current();
      } else {
        setSecondsRemaining(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionKey, secondsRemaining, isSubmitted]);

  return secondsRemaining;
}
