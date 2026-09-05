import { useEffect, useRef, useState } from 'react';

export function useAntiCheat(
  onCheatingLogged?: (cheatCount: number, totalAwaySecs: number) => void
) {
  const [cheatCount, setCheatCount] = useState<number>(0);
  const [totalAwaySecs, setTotalAwaySecs] = useState<number>(0);

  const blurStartRef = useRef<number | null>(null);
  const onCheatingLoggedRef = useRef(onCheatingLogged);
  onCheatingLoggedRef.current = onCheatingLogged;

  useEffect(() => {
    const handleLeave = () => {
      if (!blurStartRef.current) {
        blurStartRef.current = Date.now();
      }
    };

    const handleReturn = () => {
      if (blurStartRef.current) {
        const awayDurationMs = Date.now() - blurStartRef.current;
        blurStartRef.current = null;

        // Bỏ qua các sự kiện giật nháy màn hình hoặc unikey dưới 1.5 giây
        if (awayDurationMs >= 1500) {
          const awaySecs = Math.round(awayDurationMs / 1000);
          setCheatCount(prev => {
            const next = prev + 1;
            setTotalAwaySecs(t => {
              const nextTotal = t + awaySecs;
              if (onCheatingLoggedRef.current) {
                onCheatingLoggedRef.current(next, nextTotal);
              }
              return nextTotal;
            });
            return next;
          });
        }
      }
    };

    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleReturn);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLeave();
      } else {
        handleReturn();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { cheatCount, totalAwaySecs };
}
