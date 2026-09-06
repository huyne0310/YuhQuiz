import { useState, useEffect, useRef } from 'react';

export function useExamTimer(
  durationMinutes: number,
  sessionKey: string,
  onTimeOut: () => void,
  isSubmitted: boolean = false
) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!durationMinutes || durationMinutes <= 0) return 0;
    const expireKey = `expire_${sessionKey}_${durationMinutes}`;
    const savedExpire = localStorage.getItem(expireKey);
    if (savedExpire) {
      const remaining = Math.floor((parseInt(savedExpire, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    const newExpire = Date.now() + durationMinutes * 60 * 1000;
    localStorage.setItem(expireKey, newExpire.toString());
    return durationMinutes * 60;
  });

  const onTimeOutRef = useRef(onTimeOut);
  onTimeOutRef.current = onTimeOut;

  // Tự động đồng bộ đúng số phút khi đề thi tải xong từ Database
  useEffect(() => {
    if (!durationMinutes || durationMinutes <= 0 || isSubmitted) return;

    const expireKey = `expire_${sessionKey}_${durationMinutes}`;
    const savedExpire = localStorage.getItem(expireKey);

    if (savedExpire) {
      const remaining = Math.floor((parseInt(savedExpire, 10) - Date.now()) / 1000);
      setSecondsRemaining(remaining > 0 ? remaining : 0);
    } else {
      const newExpire = Date.now() + durationMinutes * 60 * 1000;
      localStorage.setItem(expireKey, newExpire.toString());
      setSecondsRemaining(durationMinutes * 60);
    }
  }, [durationMinutes, sessionKey, isSubmitted]);

  useEffect(() => {
    if (isSubmitted || !durationMinutes || durationMinutes <= 0) return;

    if (secondsRemaining <= 0) {
      onTimeOutRef.current();
      return;
    }

    const interval = setInterval(() => {
      const expireKey = `expire_${sessionKey}_${durationMinutes}`;
      const savedExpire = localStorage.getItem(expireKey);
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
  }, [sessionKey, secondsRemaining, isSubmitted, durationMinutes]);

  return secondsRemaining;
}
