import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, FileText, AlertTriangle, CheckCircle, 
  Clock, Award, Search, ArrowLeft, RefreshCw, Eye, CheckCircle2, XCircle, 
  Timer, Zap, Brain, Trash2, BarChart3, Code, LogOut, ShieldCheck, User, 
  Layers, ChevronRight 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Exam, Submission } from '../types/exam';
import { CreateExamModal } from './CreateExamModal';
import { SUBJECT_PRESETS } from '../constants/subjectPresets';

interface TeacherDashboardProps {
  currentUser?: any;
  onLogout?: () => void;
  onBackToHome: () => void;
  onPreviewExam: (examId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onLogout,
  onBackToHome,
  onPreviewExam,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null);
  const [inspectTab, setInspectTab] = useState<'visual' | 'raw'>('visual');

  // Quản lý chuyển tab trên Mobile (Kỳ thi vs Bảng điểm)
  const [mobileView, setMobileView] = useState<'exams' | 'submissions'>('exams');

  const loadExams = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      setExams(data);
      if (!selectedExam && data.length > 0) {
        setSelectedExam(data[0]);
      } else if (selectedExam) {
        const stillExists = data.find(e => e.id === selectedExam.id);
        setSelectedExam(stillExists || (data.length > 0 ? data[0] : null));
      }
    } else {
      setExams([]);
      setSelectedExam(null);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDeleteExam = async (examId: string, examTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Bạn có chắc chắn muốn xóa kỳ thi "${examTitle}" không?\nToàn bộ kết quả và bài nộp của học sinh sẽ bị xóa vĩnh viễn.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      alert('Đã xóa kỳ thi thành công!');
      if (selectedExam?.id === examId) {
        setSelectedExam(null);
        setSubmissions([]);
      }
      loadExams();
    } catch (err: any) {
      alert('Không thể xóa kỳ thi: ' + err.message);
    }
  };

  useEffect(() => {
    if (!selectedExam) {
      setSubmissions([]);
      return;
    }

    async function fetchSubmissions() {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('exam_id', selectedExam?.id)
        .order('score', { ascending: false, nullsFirst: false });

      if (data) setSubmissions(data);
    }

    fetchSubmissions();

    const channel = supabase
      .channel(`live-exam-${selectedExam.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `exam_id=eq.${selectedExam.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSubmissions(prev => [payload.new as Submission, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSubmissions(prev =>
              prev.map(sub => (sub.id === payload.new.id ? (payload.new as Submission) : sub))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExam]);

  const filteredSubs = submissions.filter(s => 
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSeconds = (sec: number | undefined) => {
    if (sec === undefined || sec === null) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getSpeedEvaluation = (sec: number | undefined) => {
    if (sec === undefined || sec === null) {
      return { label: 'Chưa có dữ liệu', color: 'text-gray-400 bg-gray-50 border-gray-100', icon: null };
    }
    if (sec < 6) {
      return { 
        label: 'Nghi vấn khoanh bừa (< 6s)', 
        color: 'text-amber-800 bg-amber-50 border-amber-200', 
        icon: <Zap className="w-3 h-3 text-amber-600" /> 
      };
    }
    if (sec < 30) {
      return { 
        label: 'Tốc độ nhanh', 
        color: 'text-blue-700 bg-blue-50 border-blue-100', 
        icon: <Clock className="w-3 h-3 text-blue-500" /> 
      };
    }
    if (sec < 120) {
      return { 
        label: 'Bình thường', 
        color: 'text-emerald-700 bg-emerald-50 border-emerald-100', 
        icon: <CheckCircle className="w-3 h-3 text-emerald-500" /> 
      };
    }
    return { 
      label: 'Suy nghĩ kỹ (> 2p)', 
      color: 'text-purple-700 bg-purple-50 border-purple-100', 
      icon: <Brain className="w-3 h-3 text-purple-500" /> 
    };
  };

  const getSubmissionAnalytics = (sub: Submission) => {
    const timestamps = (sub.answers as any)?.timestamps || {};
    let totalQuestionsAnswered = 0;
    let fastAnswersCount = 0;

    Object.values(timestamps.part_1 || {}).forEach((t: any) => {
      totalQuestionsAnswered++;
      if (typeof t === 'number' && t < 6) fastAnswersCount++;
    });
    Object.values(timestamps.part_3 || {}).forEach((t: any) => {
      totalQuestionsAnswered++;
      if (typeof t === 'number' && t < 6) fastAnswersCount++;
    });

    const isRushing = totalQuestionsAnswered > 0 && (fastAnswersCount / totalQuestionsAnswered) > 0.35;
    return { totalQuestionsAnswered, fastAnswersCount, isRushing };
  };

  const cleanStr = (s: any) => String(s || '').trim().replace(/\s+/g, '').replace(',', '.').replace(/^\+/, '');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#121212] font-sans antialiased pb-12">
      
      {/* 1. TOP HEADER (RESPONSIVE) */}
      <header className="bg-white border-b border-[#EAEAEA] px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBackToHome}
            className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0"
            title="Về trang học sinh"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-[#1DB954] flex items-center justify-center text-white font-extrabold text-xs shadow-sm flex-shrink-0">
              GV
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base tracking-tight leading-tight">Quản Trị Khảo Thí</h1>
              <p className="text-[10px] md:text-[11px] text-gray-500 truncate max-w-[160px] md:max-w-xs">
                {currentUser?.email || 'Giáo viên'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-1.5 bg-[#1DB954] hover:bg-[#169C46] active:scale-95 text-white px-3.5 md:px-5 py-1.5 md:py-2 rounded-full font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đề mới</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full font-bold text-xs transition-all"
              title="Đăng xuất"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. THANH CHUYỂN TAB TRÊN ĐIỆN THOẠI (GIẢI QUYẾT LỖI GIAO DIỆN QUAY DỌC) */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2 flex justify-around sticky top-[57px] z-20 shadow-xs">
        <button
          onClick={() => setMobileView('exams')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl text-center transition-all ${
            mobileView === 'exams'
              ? 'bg-[#1DB954] text-white shadow-sm'
              : 'text-gray-600 bg-gray-50'
          }`}
        >
          Kỳ thi ({exams.length})
        </button>
        <div className="w-2" />
        <button
          onClick={() => setMobileView('submissions')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl text-center transition-all ${
            mobileView === 'submissions'
              ? 'bg-[#1DB954] text-white shadow-sm'
              : 'text-gray-600 bg-gray-50'
          }`}
        >
          Bảng điểm ({submissions.length})
        </button>
      </div>

      {/* 3. NỘI DUNG CHÍNH (DESKTOP GRID 12 CỘT • MOBILE 1 CỘT) */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
          
          {/* CỘT TRÁI: DANH SÁCH KỲ THI */}
          <div className={`col-span-1 md:col-span-4 space-y-3 ${mobileView === 'exams' ? 'block' : 'hidden md:block'}`}>
            <div className="flex items-center justify-between pb-1">
              <h2 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Kỳ thi đã tạo ({exams.length})</h2>
              <button onClick={loadExams} className="p-1 hover:bg-gray-100 rounded text-gray-400" title="Làm mới">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {exams.map((exam) => {
                const isSelected = selectedExam?.id === exam.id;
                const preset = SUBJECT_PRESETS[exam.subject];
                const badgeClass = preset?.badge || 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <div
                    key={exam.id}
                    onClick={() => {
                      setSelectedExam(exam);
                      if (window.innerWidth < 768) {
                        setMobileView('submissions'); // Bấm chọn đề trên mobile thì tự chuyển sang xem bảng điểm
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'bg-white border-[#1DB954] shadow-md ring-2 ring-[#1DB954]/50' 
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                        {exam.subject}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{exam.duration_minutes} phút</span>
                    </div>
                    <h3 className="font-bold text-sm text-gray-900 mt-2 pr-6 leading-snug">{exam.title}</h3>
                    <p className="text-[11px] text-gray-400 mt-1">Người tạo: {exam.teacher_name || 'Giáo viên'}</p>
                    
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-xs text-gray-500">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewExam(exam.id);
                        }}
                        className="text-[#1DB954] font-semibold hover:underline flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Thi thử</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteExam(exam.id, exam.title, e)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors flex items-center space-x-1"
                        title="Xóa kỳ thi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG GIÁM SÁT REALTIME */}
          <div className={`col-span-1 md:col-span-8 bg-white border border-gray-200 rounded-3xl p-4 md:p-6 shadow-sm flex flex-col min-h-[500px] ${
            mobileView === 'submissions' ? 'block' : 'hidden md:block'
          }`}>
            {selectedExam ? (
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-4 border-b border-gray-100 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base md:text-lg font-extrabold text-gray-900 leading-snug">{selectedExam.title}</h2>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {selectedExam.subject}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Tự động cập nhật thời gian thực khi có bài nộp mới
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Tìm học sinh..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#1DB954]"
                      />
                    </div>
                  </div>
                </div>

                {/* DANH SÁCH THÍ SINH (TỐI ƯU CẢ TABLE DESKTOP VÀ CARD MOBILE) */}
                <div className="mt-4 flex-1 overflow-y-auto">
                  {filteredSubs.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 space-y-2">
                      <Users className="w-7 h-7 text-gray-300" />
                      <p className="text-xs">Chưa có bài nộp nào trong kỳ thi này</p>
                    </div>
                  ) : (
                    <>
                      {/* Giao diện Thẻ trên Điện thoại (Tránh tràn bảng ngang) */}
                      <div className="md:hidden space-y-3">
                        {filteredSubs.map((sub) => {
                          const analytics = getSubmissionAnalytics(sub);
                          return (
                            <div key={sub.id} className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-extrabold text-sm text-gray-900 block">{sub.student_name}</span>
                                  <span className="text-xs text-gray-500">Lớp: {sub.class_name}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-base font-extrabold text-[#1DB954]">
                                    {sub.score !== null ? `${sub.score} đ` : '--'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                                <div>
                                  {sub.cheat_count > 0 ? (
                                    <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-rose-100">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> Rời tab: {sub.cheat_count} lần
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-[11px]">0 lần rời tab</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setInspectSubmission(sub)}
                                  className="bg-[#1DB954] hover:bg-[#169C46] text-white px-3 py-1 rounded-full font-bold text-xs flex items-center space-x-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Soát bài</span>
                                </button>
                              </div>

                              {analytics.isRushing && (
                                <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 font-medium flex items-center space-x-1">
                                  <Zap className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                  <span>Nghi vấn khoanh bừa ({analytics.fastAnswersCount} câu &lt; 6s)</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Giao diện Bảng trên Desktop */}
                      <table className="hidden md:table w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 uppercase font-semibold">
                            <th className="py-3 px-3">Thí sinh</th>
                            <th className="py-3 px-3">Lớp</th>
                            <th className="py-3 px-3">Trạng thái</th>
                            <th className="py-3 px-3">Gian lận / Rời tab</th>
                            <th className="py-3 px-3 text-right">Điểm</th>
                            <th className="py-3 px-3 text-center">Chi tiết</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredSubs.map((sub) => {
                            const analytics = getSubmissionAnalytics(sub);
                            return (
                              <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-3">
                                  <span className="font-bold text-gray-900 block">{sub.student_name}</span>
                                  {analytics.isRushing && (
                                    <span className="inline-flex items-center space-x-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium mt-0.5">
                                      <Zap className="w-2.5 h-2.5 text-amber-500" />
                                      <span>Nghi vấn ({analytics.fastAnswersCount} câu &lt; 6s)</span>
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-medium text-gray-600">{sub.class_name}</td>
                                <td className="py-3 px-3">
                                  {sub.status === 'submitted' ? (
                                    <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                                      <CheckCircle className="w-3 h-3 mr-1" /> Đã nộp
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold">
                                      <Clock className="w-3 h-3 mr-1 animate-spin" /> Đang làm
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  {sub.cheat_count > 0 ? (
                                    <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-100">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> {sub.cheat_count} lần ({sub.total_away_seconds}s)
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-medium">0 lần</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-right font-extrabold text-sm text-[#1DB954]">
                                  {sub.score !== null ? `${sub.score} đ` : '--'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => setInspectSubmission(sub)}
                                    className="bg-[#1DB954] hover:bg-[#169C46] text-white px-3 py-1 rounded-full font-bold text-xs transition-all shadow-sm flex items-center space-x-1 mx-auto"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Soát bài</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                Vui lòng chọn kỳ thi để bắt đầu theo dõi
              </div>
            )}
          </div>

        </div>
      </div>

      {isCreateModalOpen && (
        <CreateExamModal
          currentUser={currentUser}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadExams();
          }}
        />
      )}

      {/* MODAL SOI BÀI LÀM (RESPONSIVE CO GIÃN THEO DI ĐỘNG) */}
      {inspectSubmission && selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-4 md:p-6 max-h-[90vh] flex flex-col shadow-2xl">
            
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base md:text-xl text-gray-900">{inspectSubmission.student_name}</h3>
                  <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                    {inspectSubmission.class_name}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {selectedExam.title} ({selectedExam.subject})
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <div className="bg-[#E7F7ED] border border-[#A7E6BE] px-3 py-1 rounded-xl text-center">
                  <span className="text-[9px] uppercase font-bold text-gray-500 block">Điểm</span>
                  <span className="text-base md:text-lg font-extrabold text-[#1DB954]">{inspectSubmission.score ?? '--'}</span>
                  <span className="text-[10px] text-gray-500"> / 10đ</span>
                </div>
                <button 
                  onClick={() => setInspectSubmission(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* THANH ĐÁNH GIÁ NĂNG LỰC */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 my-3">
              <div className="bg-[#FAFAFA] border border-gray-200 p-2.5 rounded-xl flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Rời màn hình</span>
                  <span className="text-xs font-bold text-gray-900">
                    {inspectSubmission.cheat_count} lần ({inspectSubmission.total_away_seconds}s)
                  </span>
                </div>
              </div>

              {(() => {
                const analytics = getSubmissionAnalytics(inspectSubmission);
                return (
                  <div className="bg-[#FAFAFA] border border-gray-200 p-2.5 rounded-xl flex items-center space-x-2.5 sm:col-span-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Độ tin cậy tốc độ làm bài</span>
                      <span className="text-xs font-bold text-gray-900">
                        {analytics.isRushing ? (
                          <span className="text-amber-700 font-extrabold">⚠️ Nghi vấn khoanh bừa ({analytics.fastAnswersCount} câu &lt; 6s)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">🟢 Bình thường, có tư duy</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* TAB CHUYỂN ĐỔI */}
            <div className="flex border-b border-gray-100 pb-1.5 space-x-3 text-xs font-bold">
              <button
                onClick={() => setInspectTab('visual')}
                className={`pb-1.5 border-b-2 flex items-center space-x-1 transition-all ${
                  inspectTab === 'visual' ? 'border-[#1DB954] text-[#1DB954]' : 'border-transparent text-gray-400'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Đối soát câu hỏi</span>
              </button>
              <button
                onClick={() => setInspectTab('raw')}
                className={`pb-1.5 border-b-2 flex items-center space-x-1 transition-all ${
                  inspectTab === 'raw' ? 'border-[#1DB954] text-[#1DB954]' : 'border-transparent text-gray-400'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Dữ liệu thô (JSON)</span>
              </button>
            </div>

            {/* CHI TIẾT NỘI DUNG */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs pr-1">
              {inspectTab === 'raw' ? (
                <pre className="bg-gray-900 text-emerald-400 p-3.5 rounded-2xl overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(inspectSubmission.answers, null, 2)}
                </pre>
              ) : (
                <div className="space-y-4">
                  {/* PHẦN I */}
                  {Object.keys(selectedExam.answer_keys?.part_1 || {}).length > 0 && (
                    <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-xs md:text-sm text-gray-900 mb-2.5">PHẦN I: Trắc nghiệm 4 lựa chọn</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.keys(selectedExam.answer_keys.part_1).map((qStr) => {
                          const qIdx = Number(qStr);
                          const studentAns = (inspectSubmission.answers as any)?.part_1?.[qIdx];
                          const key = (selectedExam.answer_keys as any)?.part_1?.[qIdx];
                          const isCorrect = (inspectSubmission.score_details as any)?.part_1?.[qIdx]?.is_correct ?? (studentAns && key && studentAns.toUpperCase() === key.toUpperCase());
                          const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_1?.[qIdx];
                          const speed = getSpeedEvaluation(timeSec);

                          return (
                            <div key={qIdx} className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-gray-800">C{qIdx}:</span>
                                  {studentAns ? (
                                    <span className={`px-1.5 py-0.5 rounded font-extrabold text-[11px] flex items-center space-x-1 ${
                                      isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      <span>{studentAns}</span>
                                      {isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> : <XCircle className="w-3 h-3 text-rose-600 inline" />}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-[11px]">Bỏ trắng</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  ĐS: <b className="text-gray-800">{key || '--'}</b>
                                </div>
                              </div>

                              <div className="text-right space-y-0.5">
                                <div className="text-[10px] font-mono text-gray-500">
                                  ⏱️ {formatSeconds(timeSec)}
                                </div>
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${speed.color}`}>
                                  {speed.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PHẦN II */}
                  {Object.keys(selectedExam.answer_keys?.part_2 || {}).length > 0 && (
                    <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-xs md:text-sm text-gray-900 mb-2.5">PHẦN II: Trắc nghiệm Đúng / Sai</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.keys(selectedExam.answer_keys.part_2).map((qStr) => {
                          const qIdx = Number(qStr);
                          const studentGroup = (inspectSubmission.answers as any)?.part_2?.[qIdx] || {};
                          const keyGroup = (selectedExam.answer_keys as any)?.part_2?.[qIdx] || {};
                          const qScore = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.score || 0;
                          const correctCount = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.correct_count || 0;

                          return (
                            <div key={qIdx} className="bg-white p-3 rounded-2xl border border-gray-200">
                              <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-gray-100">
                                <span className="font-bold text-xs text-gray-800">Câu {qIdx}</span>
                                <span className="text-[11px] font-bold text-[#1DB954]">
                                  +{qScore}đ ({correctCount}/4 đúng)
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                {['a', 'b', 'c', 'd'].map((sub) => {
                                  const val = studentGroup[sub];
                                  const key = keyGroup[sub];
                                  const isCorrect = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.details?.[sub] ?? (val !== undefined && Boolean(val) === Boolean(key));
                                  const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_2?.[qIdx]?.[sub];

                                  return (
                                    <div key={sub} className="bg-gray-50 p-1.5 rounded-lg border border-gray-100 flex items-center justify-between text-[11px]">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-bold text-gray-700">{sub})</span>
                                        {isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                                        <span>HS: <b>{val === true ? 'Đúng' : val === false ? 'Sai' : '--'}</b></span>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-gray-500">ĐS: <b className="text-[#1DB954]">{key === true ? 'Đúng' : key === false ? 'Sai' : '--'}</b></span>
                                        {timeSec && <span className="text-[9px] font-mono text-gray-400">⏱️{formatSeconds(timeSec)}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* PHẦN III */}
                  {Object.keys(selectedExam.answer_keys?.part_3 || {}).length > 0 && (
                    <div className="bg-[#FAFAFA] p-3.5 rounded-2xl border border-gray-200">
                      <h4 className="font-bold text-xs md:text-sm text-gray-900 mb-2.5">PHẦN III: Trắc nghiệm trả lời ngắn</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {Object.keys(selectedExam.answer_keys.part_3).map((qStr) => {
                          const qIdx = Number(qStr);
                          const studentAns = (inspectSubmission.answers as any)?.part_3?.[qIdx];
                          const key = (selectedExam.answer_keys as any)?.part_3?.[qIdx];
                          
                          const isCorrect = (inspectSubmission.score_details as any)?.part_3?.[qIdx]?.is_correct ?? (
                            cleanStr(studentAns) !== '' && (cleanStr(studentAns) === cleanStr(key) || Number(cleanStr(studentAns)) === Number(cleanStr(key)))
                          );
                          const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_3?.[qIdx];
                          const speed = getSpeedEvaluation(timeSec);

                          return (
                            <div key={qIdx} className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-bold text-gray-800">C{qIdx}:</span>
                                  <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[11px] ${
                                    isCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                  }`}>
                                    {studentAns || 'Bỏ trắng'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-500">
                                  ĐS: <b className="text-[#1DB954] font-mono">{key || '--'}</b>
                                </div>
                              </div>

                              <div className="text-right space-y-0.5">
                                <div className="text-[10px] font-mono text-gray-500">
                                  ⏱️ {formatSeconds(timeSec)}
                                </div>
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold border ${speed.color}`}>
                                  {speed.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
