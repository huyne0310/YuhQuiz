import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, AlertTriangle, Send, CheckCircle2, XCircle, 
  GripVertical, Award, User, RefreshCw, ArrowLeft, 
  FileText, CheckSquare, ChevronUp, ChevronDown 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useExamTimer } from '../hooks/useExamTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useAutoSave } from '../hooks/useAutoSave';
import { Exam } from '../types/exam';

interface StudentExamRoomProps {
  examId: string;
  studentName: string;
  className: string;
  onExit: () => void;
}

export const StudentExamRoom: React.FC<StudentExamRoomProps> = ({
  examId,
  studentName,
  className,
  onExit,
}) => {
  // 1. Quản lý chia đôi màn hình Desktop
  const [splitRatio, setSplitRatio] = useState<number>(55);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 2. Quản lý xem trên Mobile (Bottom Sheet trượt trong cùng 1 tab để không bị phạt gian lận)
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState<boolean>(true);

  // 3. Token phiên thi
  const [sessionToken] = useState<string>(() => {
    const key = `session_${examId}_${studentName.trim()}_${className.trim()}`;
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const newToken = crypto.randomUUID();
    localStorage.setItem(key, newToken);
    return newToken;
  });

  const [startTime] = useState<number>(() => {
    const key = `start_time_${examId}_${sessionToken}`;
    const existing = localStorage.getItem(key);
    if (existing) return parseInt(existing, 10);
    const now = Date.now();
    localStorage.setItem(key, now.toString());
    return now;
  });

  const [answers, setAnswers] = useState<any>(() => {
    const key = `draft_${examId}_${sessionToken}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            part_1: parsed.part_1 || {},
            part_2: parsed.part_2 || {},
            part_3: parsed.part_3 || {},
            timestamps: parsed.timestamps || { part_1: {}, part_2: {}, part_3: {} },
          };
        }
      } catch (e) {}
    }
    return { part_1: {}, part_2: {}, part_3: {}, timestamps: { part_1: {}, part_2: {}, part_3: {} } };
  });

  const [exam, setExam] = useState<Exam | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { cheatCount, totalAwaySecs } = useAntiCheat();
  useAutoSave(answers, examId, sessionToken, studentName, className);

  useEffect(() => {
    async function init() {
      const { data } = await supabase
        .from('public_exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (data) {
        setExam(data);
        if (data.end_at && new Date() > new Date(data.end_at)) {
          alert('Kỳ thi này đã kết thúc thời hạn nộp bài!');
        }
      }

      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', examId)
        .eq('session_token', sessionToken)
        .single();

      if (subData) {
        if (subData.status === 'submitted') {
          setIsSubmitted(true);
          setIsMobileSheetOpen(true);
          setResult({
            score: subData.score,
            score_details: subData.score_details,
            answer_keys: data?.answer_keys,
          });
        }
        if (subData.answers) {
          setAnswers((prev: any) => ({
            ...prev,
            ...subData.answers,
            timestamps: subData.answers.timestamps || prev.timestamps,
          }));
        }
      }
    }
    init();
  }, [examId, sessionToken]);

  const handleTimeOut = useCallback(() => {
    if (!isSubmitted) {
      alert('Đã hết thời gian làm bài! Hệ thống tự động nộp bài của bạn.');
      handleFinalSubmit();
    }
  }, [isSubmitted]);

  // SỬA LỖI 93 PHÚT: Lấy chính xác thời gian thi do giáo viên thiết lập (Ví dụ: 50 phút Lý, 50 phút Anh, 90 phút Toán)
  const duration = exam?.duration_minutes || 0;
  const timeLeft = useExamTimer(duration, `${examId}_${sessionToken}`, handleTimeOut, isSubmitted);

  // Kéo thả thanh chia Desktop
  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const ratio = (e.clientX / window.innerWidth) * 100;
    if (ratio >= 25 && ratio <= 75) {
      setSplitRatio(ratio);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalRelease = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('pointerup', handleGlobalRelease);
    return () => {
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('pointerup', handleGlobalRelease);
    };
  }, []);

  const updateAnswer = (part: string, qIdx: number, val: any, subKey?: string) => {
    if (isSubmitted) return;
    const elapsedSecs = Math.max(1, Math.floor((Date.now() - startTime) / 1000));

    setAnswers((prev: any) => {
      const nextPart = { ...(prev[part] || {}) };
      const nextTimestamps = { ...(prev.timestamps || {}) };
      const nextPartTs = { ...(nextTimestamps[part] || {}) };

      if (part === 'part_2' && subKey) {
        nextPart[qIdx] = { ...(nextPart[qIdx] || {}), [subKey]: val };
        nextPartTs[qIdx] = { ...(nextPartTs[qIdx] || {}), [subKey]: elapsedSecs };
      } else {
        nextPart[qIdx] = val;
        nextPartTs[qIdx] = elapsedSecs;
      }

      nextTimestamps[part] = nextPartTs;

      const nextState = {
        ...prev,
        [part]: nextPart,
        timestamps: nextTimestamps,
      };

      localStorage.setItem(`draft_${examId}_${sessionToken}`, JSON.stringify(nextState));
      return nextState;
    });
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting || isSubmitted) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_and_grade_exam', {
        p_exam_id: examId,
        p_session_token: sessionToken,
        p_student_name: studentName,
        p_class_name: className,
        p_answers: answers,
        p_cheat_count: cheatCount,
        p_total_away_seconds: totalAwaySecs,
      });

      if (error) throw error;
      setResult(data);
      setIsSubmitted(true);
      setIsMobileSheetOpen(true);
      localStorage.removeItem('active_exam_session');
    } catch (err: any) {
      alert('Có lỗi xảy ra khi nộp bài: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Màn hình chờ tải đề thi & thời gian chính xác
  if (!exam) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FAFAFA] space-y-3 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-[#1DB954]" />
        <p className="text-sm font-semibold text-gray-600">Đang chuẩn bị đề thi và thời gian làm bài...</p>
      </div>
    );
  }

  const p1Count = exam?.config?.sections?.find(s => s.id === 'part_1')?.question_count ?? 0;
  const p2Count = exam?.config?.sections?.find(s => s.id === 'part_2')?.question_count ?? 0;
  const p3Count = exam?.config?.sections?.find(s => s.id === 'part_3')?.question_count ?? 0;
  const totalQuestions = p1Count + p2Count + p3Count;

  const countAnswered = () => {
    let count = 0;
    count += Object.keys(answers.part_1 || {}).length;
    Object.values(answers.part_2 || {}).forEach((g: any) => {
      if (g && typeof g === 'object' && Object.keys(g).length === 4) count++;
    });
    count += Object.values(answers.part_3 || {}).filter(v => Boolean(v)).length;
    return count;
  };

  const getPdfEmbedUrl = () => {
    if (!exam?.pdf_url) return '';
    if (useGoogleViewer) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(exam.pdf_url)}&embedded=true`;
    }
    return `${exam.pdf_url}#toolbar=0&navpanes=0`;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#FAFAFA] text-[#121212] font-sans antialiased select-none overflow-hidden">
      
      {/* 1. TOP HEADER */}
      <header className="h-14 md:h-16 bg-white border-b border-[#EAEAEA] px-3 md:px-6 flex items-center justify-between shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <button 
            onClick={onExit}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0"
            title="Về danh sách"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm flex-shrink-0">
              {exam?.subject ? exam.subject.slice(0, 2).toUpperCase() : 'EX'}
            </div>
            <div>
              <h1 className="font-bold text-xs md:text-sm text-gray-900 truncate max-w-[130px] sm:max-w-[200px] md:max-w-xs leading-tight">
                {exam?.title}
              </h1>
              <div className="flex items-center space-x-1.5 text-[10px] md:text-[11px] text-gray-500">
                <span className="font-semibold text-gray-800">{studentName}</span>
                <span>({className})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-3">
          {cheatCount > 0 && (
            <div className="hidden sm:flex items-center space-x-1 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Rời tab: {cheatCount}</span>
            </div>
          )}

          {/* Đồng hồ đếm ngược: Hiển thị đúng số phút từ đề thi */}
          {!isSubmitted ? (
            <div className={`flex items-center space-x-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full font-mono font-bold text-xs md:text-sm tracking-wider ${
              timeLeft < 300 
                ? 'bg-rose-50 text-rose-600 border border-rose-200 animate-pulse' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-[#1DB954]" />
              <span>Đã hoàn thành</span>
            </div>
          )}

          {!isSubmitted ? (
            <button
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn nộp bài không?')) {
                  handleFinalSubmit();
                }
              }}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 bg-[#1DB954] hover:bg-[#169C46] active:scale-95 text-white px-3.5 md:px-4 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm transition-all shadow-sm flex-shrink-0"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Nộp bài</span>
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 bg-[#E7F7ED] text-[#15803D] border border-[#A7E6BE] px-3 py-1 rounded-full font-extrabold text-xs md:text-sm flex-shrink-0">
              <Award className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>{result?.score} / 10đ</span>
            </div>
          )}
        </div>
      </header>

      {/* 2. KHU VỰC TRUNG TÂM */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* KHUNG ĐỀ THI PDF */}
        <div 
          style={{ width: window.innerWidth >= 768 ? `${splitRatio}%` : '100%' }} 
          className="h-full bg-[#E5E5E5] relative overflow-hidden flex flex-col flex-1"
        >
          <div className="h-8 bg-gray-100 border-b border-gray-200 px-3 flex items-center justify-between text-[11px] text-gray-500 z-10 flex-shrink-0">
            <span className="flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span>Đọc đề trực tiếp không cần rời tab</span>
            </span>
            <button
              onClick={() => setUseGoogleViewer(!useGoogleViewer)}
              className="text-[#1DB954] hover:underline font-semibold flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{useGoogleViewer ? 'Dùng Trình đọc gốc' : 'Dùng Google Viewer'}</span>
            </button>
          </div>

          {exam?.pdf_url ? (
            <div className={`w-full flex-1 relative ${isDragging ? 'pointer-events-none select-none' : ''}`}>
              <iframe
                src={getPdfEmbedUrl()}
                title="Đề thi PDF"
                className="w-full h-full border-none"
                allow="autoplay"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1DB954]" />
              <p className="text-sm">Đang tải đề thi...</p>
            </div>
          )}
        </div>

        {/* THANH CHIA TỈ LỆ DESKTOP */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`hidden md:flex w-2 hover:w-2.5 transition-colors bg-[#F0F0F0] hover:bg-[#1DB954] cursor-col-resize items-center justify-center relative z-40 touch-none ${
            isDragging ? '!bg-[#1DB954] w-2.5 shadow-lg ring-2 ring-[#1DB954]/50' : 'border-x border-[#E0E0E0]'
          }`}
        >
          <div className="w-3.5 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center shadow-sm pointer-events-none">
            <GripVertical className="w-2.5 h-2.5 text-gray-400" />
          </div>
        </div>

        {isDragging && (
          <div 
            className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        )}

        {/* NÚT NỔI DƯỚI ĐÁY MÀN HÌNH DI ĐỘNG */}
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
          <button
            onClick={() => setIsMobileSheetOpen(true)}
            className="w-full bg-[#121212] hover:bg-black text-white px-5 py-3.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center justify-between border border-white/20 active:scale-95 transition-all"
          >
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#1DB954] animate-ping" />
              <span>Phiếu làm bài (Đã làm: {countAnswered()}/{totalQuestions})</span>
            </div>
            <div className="flex items-center space-x-1 text-[#1DB954]">
              <span>Mở phiếu</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* KHUNG PHIẾU LÀM BÀI */}
        <div 
          style={{ width: window.innerWidth >= 768 ? `${100 - splitRatio}%` : '100%' }} 
          className={`
            fixed md:relative bottom-0 left-0 right-0 z-50 md:z-20 bg-[#FAFAFA] overflow-y-auto transition-transform duration-300 ease-out shadow-2xl md:shadow-none
            ${isMobileSheetOpen ? 'translate-y-0 h-[82vh] md:h-full border-t-2 md:border-t-0 border-[#1DB954] rounded-t-3xl md:rounded-none' : 'translate-y-full md:translate-y-0 h-0 md:h-full'}
            md:block p-4 md:p-6
          `}
        >
          <div className="md:hidden flex items-center justify-between pb-3 border-b border-gray-200 mb-4 sticky top-0 bg-[#FAFAFA] z-20 pt-1">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-gray-900">Phiếu làm bài</span>
              <span className="text-xs font-bold text-gray-500">({countAnswered()}/{totalQuestions} câu)</span>
            </div>
            <button
              onClick={() => setIsMobileSheetOpen(false)}
              className="flex items-center space-x-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-full text-xs font-bold"
            >
              <span>Thu gọn</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-w-2xl mx-auto space-y-6 pb-28">
            
            {/* THẺ ĐIỂM SAU NỘP */}
            {isSubmitted && (
              <div className="bg-white border border-[#A7E6BE] rounded-3xl p-5 shadow-sm text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#1DB954]" />
                <h3 className="text-base font-bold text-[#15803D]">Bạn đã nộp bài thành công!</h3>
                <div className="mt-2 flex items-baseline justify-center space-x-1">
                  <span className="text-3xl md:text-4xl font-extrabold text-[#1DB954]">{result?.score}</span>
                  <span className="text-xs md:text-sm font-semibold text-gray-500">/ 10.0 điểm</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Xem chi tiết đáp án đúng/sai từng câu để đối chiếu ôn tập.
                </p>
              </div>
            )}

            {/* ======================= PHẦN I ======================= */}
            {p1Count > 0 && (
              <section className="bg-white border border-[#EAEAEA] rounded-3xl p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-900">PHẦN I. Trắc nghiệm 4 lựa chọn</h2>
                    <p className="text-[11px] text-gray-400">Chọn 1 phương án đúng</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold">
                    {p1Count} câu
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: p1Count }, (_, i) => i + 1).map((qIdx) => {
                    const currentChoice = answers.part_1?.[qIdx];
                    const qDetail = result?.score_details?.part_1?.[qIdx];
                    const correctKey = result?.answer_keys?.part_1?.[qIdx];

                    return (
                      <div key={qIdx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-none">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs md:text-sm text-gray-800 w-16">Câu {qIdx}:</span>
                          {isSubmitted && (
                            qDetail?.is_correct 
                              ? <span className="inline-flex items-center text-[#1DB954] text-xs font-bold"><CheckCircle2 className="w-4 h-4 mr-1" /> Đúng</span>
                              : <span className="inline-flex items-center text-rose-500 text-xs font-bold"><XCircle className="w-4 h-4 mr-1" /> Sai (ĐS: {correctKey || '--'})</span>
                          )}
                        </div>

                        <div className="flex space-x-2 md:space-x-3">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const isSelected = currentChoice === opt;
                            const isKey = isSubmitted && correctKey === opt;
                            const isWrong = isSubmitted && isSelected && !qDetail?.is_correct;

                            let style = "border-gray-200 text-gray-700 hover:border-gray-400 bg-white active:scale-95";
                            if (isSelected) style = "bg-[#1DB954] border-[#1DB954] text-white font-bold shadow-sm";
                            if (isSubmitted) {
                              if (isKey) style = "bg-[#1DB954] border-[#1DB954] text-white font-bold ring-2 ring-emerald-300";
                              else if (isWrong) style = "bg-rose-500 border-rose-500 text-white font-bold";
                              else style = "border-gray-100 text-gray-300 opacity-40 bg-white";
                            }

                            return (
                              <button
                                key={opt}
                                disabled={isSubmitted}
                                onClick={() => updateAnswer('part_1', qIdx, opt)}
                                className={`w-9 h-9 md:w-10 md:h-10 rounded-full border text-xs md:text-sm font-bold flex items-center justify-center transition-all ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ======================= PHẦN II ======================= */}
            {p2Count > 0 && (
              <section className="bg-white border border-[#EAEAEA] rounded-3xl p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-900">PHẦN II. Trắc nghiệm Đúng / Sai</h2>
                    <p className="text-[11px] text-gray-400">4 ý a, b, c, d xếp dọc • Thang lũy tiến 10% - 25% - 50% - 100%</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold">
                    {p2Count} câu
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Array.from({ length: p2Count }, (_, i) => i + 1).map((qIdx) => (
                    <div key={qIdx} className="bg-[#FAFAFA] p-3.5 md:p-4 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200/60">
                        <span className="font-extrabold text-xs md:text-sm text-gray-900">Câu {qIdx}</span>
                        {isSubmitted ? (
                          <span className="text-xs font-bold text-[#1DB954]">
                            +{result?.score_details?.part_2?.[qIdx]?.score || 0}đ ({result?.score_details?.part_2?.[qIdx]?.correct_count || 0}/4 ý đúng)
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">4 ý a, b, c, d</span>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {['a', 'b', 'c', 'd'].map((sub) => {
                          const val = answers.part_2?.[qIdx]?.[sub];
                          const isCorrect = result?.score_details?.part_2?.[qIdx]?.details?.[sub];
                          const correctVal = result?.answer_keys?.part_2?.[qIdx]?.[sub];

                          return (
                            <div 
                              key={sub} 
                              className="flex items-center justify-between py-2 px-3 rounded-xl bg-white border border-gray-200/70 hover:border-gray-300 transition-all shadow-xs"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-xs text-gray-800">Ý {sub})</span>
                                {isSubmitted && (
                                  isCorrect ? (
                                    <span className="inline-flex items-center text-[#1DB954] text-[11px] font-bold">
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-0.5" /> Đúng
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-rose-500 text-[11px] font-bold">
                                      <XCircle className="w-3.5 h-3.5 mr-0.5" /> Sai
                                    </span>
                                  )
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                {isSubmitted && (
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-[#15803D] border border-emerald-200">
                                    ĐS: {correctVal === true ? 'Đúng' : correctVal === false ? 'Sai' : '--'}
                                  </span>
                                )}

                                <div className="inline-flex rounded-xl p-0.5 bg-gray-100 border border-gray-200/60 space-x-1">
                                  <button
                                    disabled={isSubmitted}
                                    onClick={() => updateAnswer('part_2', qIdx, true, sub)}
                                    className={`min-w-[48px] md:min-w-[50px] h-8 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                                      val === true 
                                        ? (isSubmitted && !isCorrect ? 'bg-rose-500 text-white' : 'bg-[#1DB954] text-white shadow-sm')
                                        : (isSubmitted && correctVal === true ? 'border border-[#1DB954] text-[#1DB954] bg-emerald-50' : 'text-gray-600 hover:text-black hover:bg-white/60')
                                    }`}
                                  >
                                    Đúng
                                  </button>
                                  <button
                                    disabled={isSubmitted}
                                    onClick={() => updateAnswer('part_2', qIdx, false, sub)}
                                    className={`min-w-[48px] md:min-w-[50px] h-8 text-xs font-bold rounded-lg transition-all active:scale-95 ${
                                      val === false 
                                        ? (isSubmitted && !isCorrect ? 'bg-rose-500 text-white' : 'bg-[#1DB954] text-white shadow-sm')
                                        : (isSubmitted && correctVal === false ? 'border border-[#1DB954] text-[#1DB954] bg-emerald-50' : 'text-gray-600 hover:text-black hover:bg-white/60')
                                    }`}
                                  >
                                    Sai
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ======================= PHẦN III ======================= */}
            {p3Count > 0 && (
              <section className="bg-white border border-[#EAEAEA] rounded-3xl p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                  <div>
                    <h2 className="font-bold text-sm text-gray-900">PHẦN III. Trả lời ngắn</h2>
                    <p className="text-[11px] text-gray-400">Điền số hoặc số thập phân</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-bold">
                    {p3Count} câu
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: p3Count }, (_, i) => i + 1).map((qIdx) => {
                    const val = answers.part_3?.[qIdx] || '';
                    const qDetail = result?.score_details?.part_3?.[qIdx];
                    const correctKey = result?.answer_keys?.part_3?.[qIdx];

                    return (
                      <div key={qIdx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-none">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-xs md:text-sm text-gray-800 w-16">Câu {qIdx}:</span>
                          {isSubmitted && (
                            qDetail?.is_correct 
                              ? <CheckCircle2 className="w-4 h-4 text-[#1DB954]" />
                              : <XCircle className="w-4 h-4 text-rose-500" />
                          )}
                        </div>

                        <div className="flex items-center space-x-2 flex-1 max-w-[220px]">
                          <input
                            type="text"
                            disabled={isSubmitted}
                            placeholder="Điền đáp số..."
                            value={val}
                            onChange={(e) => updateAnswer('part_3', qIdx, e.target.value)}
                            className={`w-full text-xs md:text-sm px-3 py-2 rounded-xl border font-mono text-center transition-all focus:outline-none ${
                              isSubmitted 
                                ? (qDetail?.is_correct ? 'border-[#1DB954] bg-emerald-50 font-bold' : 'border-rose-300 bg-rose-50')
                                : 'border-gray-200 focus:border-[#1DB954] bg-white'
                          }`}
                        />
                        {isSubmitted && (
                          <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap">
                            ĐS: {correctKey || '--'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            )}

          </div>
        </div>

      </div>
    </div>
  );
};
