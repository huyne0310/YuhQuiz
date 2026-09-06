import React, { useMemo } from 'react';

interface BubbleConfig {
  id: number;
  size: number;
  left: number;
  duration: number;
  delay: number;
  swayDuration: number;
  gradient: string;
  shadowColor: string;
  opacity: number;
}

export const FloatingBubbles: React.FC = () => {
  // Tạo danh sách 14 hạt bong bóng màu sắc sặc sỡ nhưng mờ nhạt
  const bubbles: BubbleConfig[] = useMemo(() => [
    {
      id: 1,
      size: 65,
      left: 6,
      duration: 18,
      delay: 0,
      swayDuration: 5,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(29, 185, 84, 0.35) 40%, rgba(20, 184, 166, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(29, 185, 84, 0.15)',
      opacity: 0.75,
    },
    {
      id: 2,
      size: 42,
      left: 14,
      duration: 22,
      delay: 4,
      swayDuration: 6,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(244, 63, 94, 0.35) 40%, rgba(251, 113, 133, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(244, 63, 94, 0.15)',
      opacity: 0.7,
    },
    {
      id: 3,
      size: 85,
      left: 22,
      duration: 26,
      delay: 2,
      swayDuration: 7,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(168, 85, 247, 0.3) 40%, rgba(192, 132, 252, 0.18) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(168, 85, 247, 0.15)',
      opacity: 0.75,
    },
    {
      id: 4,
      size: 35,
      left: 31,
      duration: 16,
      delay: 7,
      swayDuration: 4.5,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(6, 182, 212, 0.35) 40%, rgba(56, 189, 248, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(6, 182, 212, 0.15)',
      opacity: 0.65,
    },
    {
      id: 5,
      size: 72,
      left: 40,
      duration: 24,
      delay: 1,
      swayDuration: 6.5,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(245, 158, 11, 0.3) 40%, rgba(251, 191, 36, 0.18) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(245, 158, 11, 0.15)',
      opacity: 0.7,
    },
    {
      id: 6,
      size: 50,
      left: 49,
      duration: 20,
      delay: 5,
      swayDuration: 5.5,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(59, 130, 246, 0.35) 40%, rgba(99, 102, 241, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(59, 130, 246, 0.15)',
      opacity: 0.75,
    },
    {
      id: 7,
      size: 90,
      left: 58,
      duration: 28,
      delay: 3,
      swayDuration: 8,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(236, 72, 153, 0.3) 40%, rgba(244, 114, 182, 0.18) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(236, 72, 153, 0.15)',
      opacity: 0.7,
    },
    {
      id: 8,
      size: 38,
      left: 67,
      duration: 17,
      delay: 8,
      swayDuration: 4.8,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(16, 185, 129, 0.35) 40%, rgba(52, 211, 153, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(16, 185, 129, 0.15)',
      opacity: 0.65,
    },
    {
      id: 9,
      size: 60,
      left: 75,
      duration: 23,
      delay: 6,
      swayDuration: 6.2,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(139, 92, 246, 0.35) 40%, rgba(167, 139, 250, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(139, 92, 246, 0.15)',
      opacity: 0.75,
    },
    {
      id: 10,
      size: 46,
      left: 83,
      duration: 19,
      delay: 2.5,
      swayDuration: 5.2,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(14, 165, 233, 0.35) 40%, rgba(56, 189, 248, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(14, 165, 233, 0.15)',
      opacity: 0.7,
    },
    {
      id: 11,
      size: 78,
      left: 91,
      duration: 25,
      delay: 9,
      swayDuration: 7.5,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(249, 115, 22, 0.3) 40%, rgba(251, 146, 60, 0.18) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(249, 115, 22, 0.15)',
      opacity: 0.7,
    },
    {
      id: 12,
      size: 32,
      left: 3,
      duration: 15,
      delay: 11,
      swayDuration: 4.2,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(217, 70, 239, 0.35) 40%, rgba(232, 121, 249, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(217, 70, 239, 0.15)',
      opacity: 0.65,
    },
    {
      id: 13,
      size: 55,
      left: 52,
      duration: 21,
      delay: 13,
      swayDuration: 5.8,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(34, 197, 94, 0.35) 40%, rgba(74, 222, 128, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(34, 197, 94, 0.15)',
      opacity: 0.7,
    },
    {
      id: 14,
      size: 68,
      left: 36,
      duration: 27,
      delay: 10,
      swayDuration: 6.8,
      gradient: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), rgba(168, 85, 247, 0.35) 40%, rgba(244, 63, 94, 0.2) 70%, rgba(255, 255, 255, 0.1))',
      shadowColor: 'rgba(168, 85, 247, 0.15)',
      opacity: 0.7,
    }
  ], []);

  return (
    <div 
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none"
    >
      <style>{`
        @keyframes bubbleRise {
          0% {
            transform: translateY(105vh) scale(0.85);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-20vh) scale(1.1);
            opacity: 0;
          }
        }
        @keyframes bubbleSway {
          0%, 100% {
            margin-left: 0px;
          }
          50% {
            margin-left: 35px;
          }
        }
      `}</style>

      {bubbles.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: `${b.left}%`,
            bottom: '-120px',
            width: `${b.size}px`,
            height: `${b.size}px`,
            borderRadius: '50%',
            background: b.gradient,
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: `inset -3px -3px 8px rgba(255, 255, 255, 0.7), inset 3px 3px 8px ${b.shadowColor}, 0 6px 20px ${b.shadowColor}`,
            opacity: b.opacity,
            backdropFilter: 'blur(1.5px)',
            animation: `bubbleRise ${b.duration}s infinite linear ${b.delay}s, bubbleSway ${b.swayDuration}s infinite ease-in-out alternate`,
            willChange: 'transform, margin-left',
          }}
        />
      ))}
    </div>
  );
};
