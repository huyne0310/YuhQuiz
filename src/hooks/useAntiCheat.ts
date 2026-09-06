import { useEffect, useRef, useState } from 'react';

export function useAntiCheat(
  enabled: boolean = true,
  onCheatingLogged?: (cheatCount: number, totalAwaySecs: number) => void
) {
  const [cheatCount, setCheatCount] = useState<number>(0);
  const [totalAwaySecs, setTotalAwaySecs] = useState<number>(0);
  const [lastWarningReason, setLastWarningReason] = useState<string | null>(null);

  const awayStartTime = useRef<number | null>(null);
  const blurTimer = useRef<NodeJS.Timeout | null>(null);
  const lastWidth = useRef<number>(window.innerWidth);

  const recordViolation = (reason: string, awaySecs: number = 0) => {
    // NẾU TẮT HOẶC ĐÃ NỘP BÀI THÌ TUYỆT ĐỐI KHÔNG GHI NHẬN VI PHẠM
    if (!enabled) return;

    setCheatCount(prev => {
      const next = prev + 1;
      setTotalAwaySecs(currAway => {
        const total = currAway + awaySecs;
        if (onCheatingLogged) onCheatingLogged(next, total);
        return total;
      });
      return next;
    });
    setLastWarningReason(reason);
  };

  useEffect(() => {
    // KHI ĐÃ NỘP BÀI (!enabled) -> HOÀN TOÀN TẮT BỎ CÁC BỘ CẢM BIẾN THEO DÕI
    if (!enabled) {
      return;
    }

    // 1. Phát hiện chuyển Tab & Ẩn trang (Page Visibility)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        awayStartTime.current = Date.now();
      } else {
        if (awayStartTime.current) {
          const awaySecs = Math.max(1, Math.floor((Date.now() - awayStartTime.current) / 1000));
          recordViolation('Chuyển sang tab hoặc ứng dụng khác', awaySecs);
          awayStartTime.current = null;
        }
      }
    };

    // 2. Phát hiện Mất tiêu điểm cửa sổ (Window Blur) với debounce 1.5s
    const handleBlur = () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(() => {
        if (!awayStartTime.current) {
          awayStartTime.current = Date.now();
        }
      }, 1500);
    };

    const handleFocus = () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
      if (awayStartTime.current) {
        const awaySecs = Math.max(1, Math.floor((Date.now() - awayStartTime.current) / 1000));
        recordViolation('Mất tiêu điểm cửa sổ làm bài', awaySecs);
        awayStartTime.current = null;
      }
    };

    // 3. TẦNG 1: PHÁT HIỆN MỞ THANH BÊN AI (RESIZE DETECTION)
    const handleResize = () => {
      const delta = lastWidth.current - window.innerWidth;
      if (delta >= 180 && window.innerWidth < 1100) {
        recordViolation('Phát hiện mở thanh bên AI / chia đôi màn hình', 2);
      }
      lastWidth.current = window.innerWidth;
    };

    // 4. TẦNG 2: PHÁT HIỆN THOÁT TOÀN MÀN HÌNH
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('Thoát chế độ toàn màn hình', 1);
      }
    };

    // 5. TẦNG 3: CHẶN PHÍM TẮT TRA CỨU & COPY/PASTE
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c')) ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's'))
      ) {
        e.preventDefault();
        recordViolation(`Sử dụng phím tắt bị cấm (${e.key})`, 0);
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, [enabled]);

  return { cheatCount, totalAwaySecs, lastWarningReason };
}
