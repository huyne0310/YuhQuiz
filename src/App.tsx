import React, { useState, useEffect } from 'react';
import { BookOpen, User, ShieldCheck, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import { supabase } from './lib/supabase';
import { StudentExamRoom } from './components/StudentExamRoom';
import { TeacherDashboard } from './components/TeacherDashboard';
import { Exam } from './types/exam';

export function App() {
  const [mode, setMode] = useState<'home' | 'student_exam' | 'teacher'>('home');
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');

  // 1. Tải danh sách đề thi & Khôi phục phiên thi đang dang dở khi F5 reload
  useEffect(() => {
    async function init() {
      // Khôi phục phiên thi nếu học sinh vừa F5
      const savedSession = localStorage.getItem('active_exam_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.examId && parsed.studentName && parsed.className) {
            setSelectedExamId(parsed.examId);
            setStudentName(parsed.studentName);
            setClassName(parsed.className);
            setMode('student_exam');
          }
        } catch (e) {}
      }

      // Tải danh sách các kỳ thi công khai
      const { data } = await supabase
        .from('public_exams')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setExams(data);
        if (!selectedExamId && !savedSession) {
          setSelectedExamId(data[0].id);
        }
      }
    }
    init();
  }, []);

  const handleStartExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !className.trim() || !selectedExamId) {
      alert('Vui lòng nhập đầy đủ Họ tên, Lớp và chọn Đề thi!');
      return;
    }

    // Lưu phiên thi vào LocalStorage để chống mất khi F5
    localStorage.setItem(
      'active_exam_session',
      JSON.stringify({
        examId: selectedExamId,
        studentName: studentName.trim(),
        className: className.trim(),
      })
    );

    setMode('student_exam');
  };

  const handleExitExam = () => {
    if (confirm('Bạn có chắc muốn thoát khỏi phòng thi?')) {
      localStorage.removeItem('active_exam_session');
      setMode('home');
    }
  };

  // 1. Chế độ Phòng thi học sinh
  if (mode === 'student_exam') {
    return (
      <StudentExamRoom
        examId={selectedExamId}
        studentName={studentName}
        className={className}
        onExit={handleExitExam}
      />
    );
  }

  // 2. Chế độ Giáo viên quản trị
  if (mode === 'teacher') {
    return (
      <TeacherDashboard
        onBackToHome={() => setMode('home')}
        onPreviewExam={(examId) => {
          setSelectedExamId(examId);
          setStudentName('Học Sinh Thử Nghiệm');
          setClassName('12 Demo');
          localStorage.setItem(
            'active_exam_session',
            JSON.stringify({
              examId,
              studentName: 'Học Sinh Thử Nghiệm',
              className: '12 Demo',
            })
          );
          setMode('student_exam');
        }}
      />
    );
  }

  // 3. Trang chủ Lựa chọn (Spotify Light Theme Landing)
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#121212] flex flex-col justify-between font-sans">
      
      {/* NAVBAR */}
      <nav className="h-20 max-w-7xl mx-auto w-full px-8 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954] flex items-center justify-center text-white font-extrabold shadow-sm">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight">Yuh<span className="text-[#1DB954]">Quiz</span></span>
            <span className="text-[10px] block font-semibold text-gray-400 -mt-1 uppercase tracking-wider">THPT Quốc Gia</span>
          </div>
        </div>

        <button
          onClick={() => setMode('teacher')}
          className="flex items-center space-x-2 text-xs font-bold text-gray-600 hover:text-black bg-white border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-full transition-all shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-[#1DB954]" />
          <span>Dành cho Giáo viên</span>
        </button>
      </nav>

      {/* HERO & VÀO PHÒNG THI */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 text-[#15803D] border border-emerald-200 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#1DB954]" />
          <span>Hi</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-950 tracking-tight max-w-2xl leading-tight">
          Luyện đề và thi trực tuyến tinh gọn, chuẩn xác.
        </h1>
        <p className="text-sm md:text-base text-gray-500 mt-4 max-w-xl">
          Vào thi ngay chỉ với Họ tên & Lớp.
        </p>

        {/* FORM THÍ SINH VÀO THI */}
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 mt-10 shadow-xl shadow-gray-100/50 text-left">
          <form onSubmit={handleStartExam} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Họ và tên thí sinh *</label>
              <input
                type="text"
                required
                placeholder="VD: Nguyễn Văn Huy"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#FAFAFA] border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Lớp *</label>
              <input
                type="text"
                required
                placeholder="VD: 12A1"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#FAFAFA] border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1.5">Chọn đề thi *</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-[#FAFAFA] border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none font-semibold text-gray-800"
              >
                {exams.length === 0 ? (
                  <option value="">Chưa có đề thi nào mở</option>
                ) : (
                  exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      [{ex.subject}] {ex.title} ({ex.duration_minutes} phút)
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="submit"
              disabled={exams.length === 0}
              className="w-full mt-2 bg-[#1DB954] hover:bg-[#169C46] active:scale-[0.98] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <span>Bắt đầu làm bài thi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="h-16 border-t border-gray-100 flex items-center justify-center text-xs text-gray-400">
        Phát triển theo quy chuẩn đề thi khảo sát và tốt nghiệp THPT từ năm 2025.
      </footer>

    </div>
  );
}
export default App;
