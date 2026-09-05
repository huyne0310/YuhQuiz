import React, { useState, useEffect } from 'react';
import { 
  Plus, Users, FileText, AlertTriangle, CheckCircle, 
  Clock, Award, Search, ArrowLeft, RefreshCw, Eye, CheckCircle2, XCircle, 
  Timer, Zap, Brain, Trash2, BarChart3, Code
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Exam, Submission } from '../types/exam';
import { CreateExamModal } from './CreateExamModal';

interface TeacherDashboardProps {
  onBackToHome: () => void;
  onPreviewExam: (examId: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
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
        // Cập nhật lại selectedExam nếu còn tồn tại
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

  // XÓA KỲ THI
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

  // Chuẩn hóa so sánh chuỗi số bỏ qua khoảng trắng và dấu phẩy
  const cleanStr = (s: any) => String(s || '').trim().replace(/\s+/g, '').replace(',', '.').replace(/^\+/, '');

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#121212] font-sans antialiased">
      {/* TOP HEADER */}
      <header className="h-16 bg-white border-b border-[#EAEAEA] px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBackToHome}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all"
            title="Về trang chủ"
          >
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1DB954] flex items-center justify-center text-white font-extrabold shadow-sm">
              GV
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight leading-tight">Trung Tâm Quản Trị Khảo Thí</h1>
              <p className="text-[11px] text-gray-500">Giám sát bài làm, thời gian và gian lận học sinh</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 bg-[#1DB954] hover:bg-[#169C46] active:scale-95 text-white px-5 py-2 rounded-full font-bold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo đề thi mới</span>
        </button>
      </header>

      {/* BODY */}
      <div className="max-w-7xl mx-auto p-8 grid grid-cols-12 gap-8">
        
        {/* CỘT TRÁI: DANH SÁCH KỲ THI (KÈM NÚT XÓA KỲ THI) */}
        <div className="col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xs text-gray-500 uppercase tracking-wider">Kỳ thi của bạn ({exams.length})</h2>
            <button onClick={loadExams} className="p-1 hover:bg-gray-100 rounded" title="Làm mới">
              <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3">
            {exams.map((exam) => {
              const isSelected = selectedExam?.id === exam.id;
              return (
                <div
                  key={exam.id}
                  onClick={() => setSelectedExam(exam)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected 
                      ? 'bg-white border-[#1DB954] shadow-md ring-1 ring-[#1DB954]' 
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {exam.subject}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{exam.duration_minutes} phút</span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mt-2 pr-6">{exam.title}</h3>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
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

                    {/* NÚT XÓA KỲ THI */}
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
        <div className="col-span-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[600px]">
          {selectedExam ? (
            <>
              <div className="flex justify-between items-center pb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-extrabold text-gray-900">{selectedExam.title}</h2>
                    <button
                      onClick={() => handleDeleteExam(selectedExam.id, selectedExam.title)}
                      className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 transition-colors"
                      title="Xóa kỳ thi"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Xóa kỳ thi</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Đồng bộ thời gian thực mỗi khi có học sinh nộp bài hoặc chuyển tab
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên, lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#1DB954]"
                    />
                  </div>
                </div>
              </div>

              {/* BẢNG THÍ SINH */}
              <div className="mt-4 flex-1 overflow-y-auto">
                {filteredSubs.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
                    <Users className="w-8 h-8 text-gray-300" />
                    <p className="text-sm">Chưa có thí sinh nào tham gia kỳ thi này</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
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
                            <td className="py-3.5 px-3">
                              <span className="font-bold text-gray-900 block">{sub.student_name}</span>
                              {analytics.isRushing && (
                                <span className="inline-flex items-center space-x-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium mt-0.5">
                                  <Zap className="w-2.5 h-2.5 text-amber-500" />
                                  <span>Tốc độ bất thường ({analytics.fastAnswersCount} câu &lt; 6s)</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 font-medium text-gray-600">{sub.class_name}</td>
                            <td className="py-3.5 px-3">
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
                            <td className="py-3.5 px-3">
                              {sub.cheat_count > 0 ? (
                                <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-semibold border border-rose-100">
                                  <AlertTriangle className="w-3 h-3 mr-1" /> {sub.cheat_count} lần ({sub.total_away_seconds}s)
                                </span>
                              ) : (
                                <span className="text-gray-400 font-medium">0 lần</span>
                              )}
                            </td>
                            <td className="py-3.5 px-3 text-right font-extrabold text-sm text-[#1DB954]">
                              {sub.score !== null ? `${sub.score} đ` : '--'}
                            </td>
                            <td className="py-3.5 px-3 text-center">
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
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Vui lòng chọn kỳ thi để bắt đầu theo dõi
            </div>
          )}
        </div>

      </div>

      {isCreateModalOpen && (
        <CreateExamModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadExams();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL SOI BÀI LÀM TRỰC QUAN & PHÂN TÍCH */}
      {/* ========================================================================= */}
      {inspectSubmission && selectedExam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl">
            
            {/* MODAL HEADER */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="font-extrabold text-xl text-gray-900">{inspectSubmission.student_name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-bold">
                    Lớp: {inspectSubmission.class_name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Kỳ thi: <span className="font-semibold text-gray-700">{selectedExam.title}</span>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-[#E7F7ED] border border-[#A7E6BE] px-4 py-1.5 rounded-2xl text-center">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Tổng điểm</span>
                  <span className="text-xl font-extrabold text-[#1DB954]">{inspectSubmission.score ?? '--'}</span>
                  <span className="text-xs text-gray-500"> / 10.0</span>
                </div>
                <button 
                  onClick={() => setInspectSubmission(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-sm transition-all"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* THANH ĐÁNH GIÁ NĂNG LỰC */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-[#FAFAFA] border border-gray-200 p-3 rounded-2xl flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 block">Rời màn hình / Tab</span>
                  <span className="text-xs font-bold text-gray-900">
                    {inspectSubmission.cheat_count} lần ({inspectSubmission.total_away_seconds} giây)
                  </span>
                </div>
              </div>

              {(() => {
                const analytics = getSubmissionAnalytics(inspectSubmission);
                return (
                  <div className="bg-[#FAFAFA] border border-gray-200 p-3 rounded-2xl flex items-center space-x-3 col-span-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] text-gray-500 block">Đánh giá độ tin cậy thời gian</span>
                      <span className="text-xs font-bold text-gray-900">
                        {analytics.isRushing ? (
                          <span className="text-amber-700 font-extrabold">⚠️ Nghi vấn chọn bừa ({analytics.fastAnswersCount} câu dưới 6s)</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">🟢 Tốc độ bình thường, có tư duy suy nghĩ</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* CHUYỂN TAB */}
            <div className="flex border-b border-gray-100 pb-2 space-x-4 text-xs font-bold">
              <button
                onClick={() => setInspectTab('visual')}
                className={`pb-2 border-b-2 flex items-center space-x-1.5 transition-all ${
                  inspectTab === 'visual' ? 'border-[#1DB954] text-[#1DB954]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Đối soát từng câu (Đúng / Sai & Thời gian)</span>
              </button>
              <button
                onClick={() => setInspectTab('raw')}
                className={`pb-2 border-b-2 flex items-center space-x-1.5 transition-all ${
                  inspectTab === 'raw' ? 'border-[#1DB954] text-[#1DB954]' : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Xem Dữ liệu thô (JSON)</span>
              </button>
            </div>

            {/* CHI TIẾT */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs pr-1">
              
              {inspectTab === 'raw' ? (
                <div className="space-y-4">
                  <div>
                    <p className="font-bold text-gray-700 mb-2">Đáp án học sinh gửi lên:</p>
                    <pre className="bg-gray-900 text-emerald-400 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(inspectSubmission.answers, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-bold text-gray-700 mb-2">Chi tiết điểm từ server (score_details):</p>
                    <pre className="bg-gray-900 text-blue-300 p-4 rounded-2xl overflow-x-auto text-[11px] font-mono">
                      {JSON.stringify(inspectSubmission.score_details, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* PHẦN I */}
                  <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-gray-900">PHẦN I: Trắc nghiệm 4 lựa chọn (12 câu)</h4>
                      <span className="text-xs text-gray-500 font-semibold">0.25đ / câu</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((qIdx) => {
                        const studentAns = (inspectSubmission.answers as any)?.part_1?.[qIdx];
                        const key = (selectedExam.answer_keys as any)?.part_1?.[qIdx];
                        const isCorrect = (inspectSubmission.score_details as any)?.part_1?.[qIdx]?.is_correct ?? (studentAns && key && studentAns.toUpperCase() === key.toUpperCase());
                        const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_1?.[qIdx];
                        const speed = getSpeedEvaluation(timeSec);

                        return (
                          <div key={qIdx} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-800">Câu {qIdx}:</span>
                                {studentAns ? (
                                  <span className={`px-2 py-0.5 rounded font-extrabold text-xs flex items-center space-x-1 ${
                                    isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    <span>Chọn {studentAns}</span>
                                    {isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> : <XCircle className="w-3 h-3 text-rose-600 inline" />}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic">Bỏ trắng</span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Đáp án đúng: <span className="font-bold text-gray-800">{key || '--'}</span>
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <div className="text-[11px] font-mono text-gray-600 flex items-center justify-end space-x-1">
                                <Timer className="w-3 h-3 text-gray-400" />
                                <span>{formatSeconds(timeSec)}</span>
                              </div>
                              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${speed.color}`}>
                                {speed.icon}
                                <span>{speed.label}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PHẦN II (ĐÃ ĐỐI SOÁT CHUẨN XÁC) */}
                  <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-gray-900">PHẦN II: Trắc nghiệm Đúng / Sai (4 câu)</h4>
                      <span className="text-xs text-gray-500 font-semibold">Thang lũy tiến 0.1 - 0.25 - 0.5 - 1.0</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 4 }, (_, i) => i + 1).map((qIdx) => {
                        const studentGroup = (inspectSubmission.answers as any)?.part_2?.[qIdx] || {};
                        const keyGroup = (selectedExam.answer_keys as any)?.part_2?.[qIdx] || {};
                        const qScore = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.score || 0;
                        const correctCount = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.correct_count || 0;

                        return (
                          <div key={qIdx} className="bg-white p-4 rounded-2xl border border-gray-200">
                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                              <span className="font-bold text-sm text-gray-800">Câu {qIdx}</span>
                              <span className="text-xs font-bold text-[#1DB954]">
                                Đạt: {qScore}đ ({correctCount}/4 ý đúng)
                              </span>
                            </div>

                            <div className="space-y-2">
                              {['a', 'b', 'c', 'd'].map((sub) => {
                                const val = studentGroup[sub];
                                const key = keyGroup[sub];
                                const isCorrect = (inspectSubmission.score_details as any)?.part_2?.[qIdx]?.details?.[sub] ?? (val !== undefined && Boolean(val) === Boolean(key));
                                const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_2?.[qIdx]?.[sub];

                                return (
                                  <div key={sub} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-xs text-gray-700">Ý {sub})</span>
                                      {isCorrect ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                      )}
                                      <span className="text-xs">
                                        HS: <b className={val === true ? 'text-emerald-700' : val === false ? 'text-rose-700' : 'text-gray-400'}>
                                          {val === true ? 'Đúng' : val === false ? 'Sai' : '--'}
                                        </b>
                                      </span>
                                    </div>

                                    <div className="flex items-center space-x-3 text-right">
                                      <span className="text-[11px] text-gray-700">
                                        ĐS: <b className="text-[#1DB954]">{key === true ? 'Đúng' : key === false ? 'Sai' : '--'}</b>
                                      </span>
                                      {timeSec && (
                                        <span className="text-[10px] font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border">
                                          ⏱️ {formatSeconds(timeSec)}
                                        </span>
                                      )}
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

                  {/* PHẦN III */}
                  <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-sm text-gray-900">PHẦN III: Trắc nghiệm trả lời ngắn (6 câu)</h4>
                      <span className="text-xs text-gray-500 font-semibold">0.5đ / câu</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((qIdx) => {
                        const studentAns = (inspectSubmission.answers as any)?.part_3?.[qIdx];
                        const key = (selectedExam.answer_keys as any)?.part_3?.[qIdx];
                        
                        // So khớp chuẩn hóa không khoảng trắng
                        const isCorrect = (inspectSubmission.score_details as any)?.part_3?.[qIdx]?.is_correct ?? (
                          cleanStr(studentAns) !== '' && (cleanStr(studentAns) === cleanStr(key) || Number(cleanStr(studentAns)) === Number(cleanStr(key)))
                        );
                        const timeSec = (inspectSubmission.answers as any)?.timestamps?.part_3?.[qIdx];
                        const speed = getSpeedEvaluation(timeSec);

                        return (
                          <div key={qIdx} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-gray-800">Câu {qIdx}:</span>
                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs flex items-center space-x-1 ${
                                  isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  <span>{studentAns || 'Bỏ trắng'}</span>
                                  {isCorrect ? <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" /> : <XCircle className="w-3 h-3 text-rose-600 inline" />}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Đáp số đúng: <span className="font-bold font-mono text-[#1DB954]">{key || '--'}</span>
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <div className="text-[11px] font-mono text-gray-600 flex items-center justify-end space-x-1">
                                <Timer className="w-3 h-3 text-gray-400" />
                                <span>{formatSeconds(timeSec)}</span>
                              </div>
                              <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold border ${speed.color}`}>
                                {speed.icon}
                                <span>{speed.label}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
