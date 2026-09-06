import React, { useState } from 'react';
import { X, Upload, Check, RefreshCw, Calendar, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SUBJECT_PRESETS, MAX_QUESTION_LIMITS } from '../constants/subjectPresets';

interface CreateExamModalProps {
  currentUser?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [subject, setSubject] = useState<string>('Toán');
  const defaultPreset = SUBJECT_PRESETS['Toán'];

  const [title, setTitle] = useState('');
  const [teacherName, setTeacherName] = useState(
    currentUser?.user_metadata?.full_name || 'Thầy Nguyễn Văn A'
  );
  const [duration, setDuration] = useState(defaultPreset.duration);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cấu hình số câu hỏi & Thang điểm từng phần (Được preset theo môn)
  const [p1Count, setP1Count] = useState(defaultPreset.p1Count);
  const [p1Score, setP1Score] = useState(defaultPreset.p1Score);

  const [p2Count, setP2Count] = useState(defaultPreset.p2Count);
  const [p2Score, setP2Score] = useState(defaultPreset.p2Score);

  const [p3Count, setP3Count] = useState(defaultPreset.p3Count);
  const [p3Score, setP3Score] = useState(defaultPreset.p3Score);

  // Khung thời gian mở / đóng đề thi
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  // Đáp án chuẩn
  const [p1Keys, setP1Keys] = useState<Record<number, string>>({});
  const [p2Keys, setP2Keys] = useState<Record<number, Record<string, boolean>>>({});
  const [p3Keys, setP3Keys] = useState<Record<number, string>>({});

  // Khi giáo viên chọn môn học khác -> Tự động nạp Preset của môn đó
  const handleSubjectChange = (newSub: string) => {
    setSubject(newSub);
    const preset = SUBJECT_PRESETS[newSub];
    if (preset) {
      setDuration(preset.duration);
      setP1Count(preset.p1Count);
      setP1Score(preset.p1Score);
      setP2Count(preset.p2Count);
      setP2Score(preset.p2Score);
      setP3Count(preset.p3Count);
      setP3Score(preset.p3Score);
    }
  };

  // Upload file PDF lên Supabase Storage
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File PDF không được vượt quá 15MB để tối ưu dung lượng!');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      const { error } = await supabase.storage
        .from('exam-pdfs')
        .upload(fileName, file);

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('exam-pdfs')
        .getPublicUrl(fileName);

      setPdfUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      alert('Không thể tải file lên Storage: ' + err.message + '\nBạn có thể dán link PDF trực tiếp vào ô bên cạnh.');
    } finally {
      setIsUploading(false);
    }
  };

  // Lưu kỳ thi
  const handleSaveExam = async () => {
    if (!title.trim() || !pdfUrl.trim()) {
      alert('Vui lòng nhập tiêu đề kỳ thi và cung cấp file PDF!');
      return;
    }

    if (p1Count > MAX_QUESTION_LIMITS.P1_MAX || p2Count > MAX_QUESTION_LIMITS.P2_MAX || p3Count > MAX_QUESTION_LIMITS.P3_MAX) {
      alert(`Số câu hỏi vượt quá giới hạn tối đa cho phép (Phần I: ${MAX_QUESTION_LIMITS.P1_MAX}, Phần II: ${MAX_QUESTION_LIMITS.P2_MAX}, Phần III: ${MAX_QUESTION_LIMITS.P3_MAX})`);
      return;
    }

    if (hasTimeLimit && startAt && endAt && new Date(startAt) >= new Date(endAt)) {
      alert('Thời gian bắt đầu mở đề phải trước thời gian kết thúc đóng đề!');
      return;
    }

    setIsSaving(true);
    try {
      const config = {
        sections: [
          { id: 'part_1', title: 'PHẦN I. Trắc nghiệm 4 lựa chọn', type: 'single_choice', question_count: p1Count, total_score: p1Score },
          { id: 'part_2', title: 'PHẦN II. Trắc nghiệm Đúng / Sai', type: 'true_false_group', question_count: p2Count, total_score: p2Score },
          { id: 'part_3', title: 'PHẦN III. Trả lời ngắn', type: 'short_answer', question_count: p3Count, total_score: p3Score },
        ],
        p1_total_score: p1Score,
        p2_total_score: p2Score,
        p3_total_score: p3Score,
      };

      const answerKeys = {
        part_1: p1Keys,
        part_2: p2Keys,
        part_3: p3Keys,
      };

      const { error } = await supabase.from('exams').insert({
        title: title.trim(),
        subject,
        duration_minutes: duration,
        teacher_name: teacherName.trim() || 'Giáo viên',
        created_by: currentUser?.id || null,
        pdf_url: pdfUrl.trim(),
        start_at: hasTimeLimit && startAt ? new Date(startAt).toISOString() : null,
        end_at: hasTimeLimit && endAt ? new Date(endAt).toISOString() : null,
        config,
        answer_keys: answerKeys,
        is_active: true,
      });

      if (error) throw error;
      alert('Đã tạo kỳ thi thành công!');
      onSuccess();
    } catch (err: any) {
      alert('Lỗi lưu đề thi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const totalExamScore = Math.round((p1Score + p2Score + p3Score) * 10) / 10;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 max-h-[92vh] flex flex-col shadow-2xl">
        
        {/* HEADER */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Thiết Lập Kỳ Thi & Preset Đa Môn Học</h2>
            <p className="text-xs text-gray-500">Tự động cấu hình chuẩn theo quy chế Bộ Giáo dục & Đào tạo từ 2025</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs pr-1">
          
          {/* 1. THÔNG TIN CƠ BẢN */}
          <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="font-bold text-gray-700 block mb-1">Tên kỳ thi / Đề thi *</label>
              <input
                type="text"
                required
                placeholder="VD: Khảo Sát Chất Lượng Đầu Năm Môn Toán 12"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Thầy / Cô giao đề</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
            </div>

            {/* DROPDOWN CHỌN MÔN HỌC */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">Môn học thi (Preset tự động) *</label>
              <select
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none font-bold text-gray-800"
              >
                {Object.keys(SUBJECT_PRESETS).map((subKey) => (
                  <option key={subKey} value={subKey}>
                    {subKey}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Thời gian làm bài (Phút)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none text-center font-bold"
              />
            </div>

            <div className="flex flex-col justify-end">
              <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                <span className="text-[10px] text-gray-500 font-semibold block">Tổng điểm toàn bài</span>
                <span className="text-sm font-extrabold text-[#15803D]">{totalExamScore} điểm</span>
              </div>
            </div>
          </div>

          {/* 2. GIỚI HẠN KHUNG THỜI GIAN MỞ / ĐÓNG ĐỀ THI */}
          <div className="bg-[#FAFAFA] p-4 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTimeLimit}
                  onChange={(e) => setHasTimeLimit(e.target.checked)}
                  className="rounded text-[#1DB954] focus:ring-[#1DB954] w-4 h-4"
                />
                <span className="font-bold text-gray-800">Đặt lịch mở & đóng đề thi (Giới hạn thời hạn nộp)</span>
              </label>
              {hasTimeLimit && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Tự động khóa khi hết hạn
                </span>
              )}
            </div>

            {hasTimeLimit && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Thời điểm bắt đầu mở đề:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Thời điểm kết thúc / đóng đề:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. ĐƯỜNG DẪN PDF */}
          <div>
            <label className="font-bold text-gray-700 block mb-1">File Đề thi PDF *</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Dán link file PDF (Google Drive, URL) hoặc tải file..."
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-semibold flex items-center space-x-1.5 transition-all">
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-[#1DB954]" /> : <Upload className="w-4 h-4 text-gray-600" />}
                <span>{isUploading ? 'Đang tải...' : 'Upload PDF'}</span>
                <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* ===================== 4. CẤU HÌNH PHẦN I ===================== */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-bold text-gray-900 text-sm">PHẦN I: Trắc nghiệm 4 lựa chọn</span>
                <span className="text-gray-500 text-[11px] block">
                  Mỗi câu: {p1Count > 0 ? (p1Score / p1Count).toFixed(3) : 0} điểm
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Số câu (Max 60):</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_QUESTION_LIMITS.P1_MAX}
                    value={p1Count}
                    onChange={(e) => setP1Count(Math.min(MAX_QUESTION_LIMITS.P1_MAX, Math.max(0, Number(e.target.value))))}
                    className="w-14 px-2 py-0.5 border rounded bg-white text-center font-bold"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Tổng điểm:</span>
                  <input
                    type="number"
                    step={0.1}
                    value={p1Score}
                    onChange={(e) => setP1Score(Number(e.target.value))}
                    className="w-16 px-2 py-0.5 border rounded bg-white text-center font-bold text-[#1DB954]"
                  />
                </div>
              </div>
            </div>

            {p1Count > 0 ? (
              <div className="grid grid-cols-6 gap-2 pt-2 border-t border-gray-200">
                {Array.from({ length: p1Count }, (_, i) => i + 1).map((qIdx) => (
                  <div key={qIdx} className="flex items-center space-x-1 bg-white p-1 rounded-lg border">
                    <span className="font-bold text-[11px] text-gray-600 w-6">C{qIdx}:</span>
                    <select
                      value={p1Keys[qIdx] || ''}
                      onChange={(e) => setP1Keys({ ...p1Keys, [qIdx]: e.target.value })}
                      className="w-full bg-transparent font-bold text-gray-800 focus:outline-none"
                    >
                      <option value="">-</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-[11px]">Môn học này không có Phần I.</p>
            )}
          </div>

          {/* ===================== 5. CẤU HÌNH PHẦN II ===================== */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-bold text-gray-900 text-sm">PHẦN II: Trắc nghiệm Đúng / Sai (4 ý a, b, c, d)</span>
                <span className="text-gray-500 text-[11px] block">
                  Mỗi câu: {p2Count > 0 ? (p2Score / p2Count).toFixed(2) : 0} điểm (Áp dụng lũy tiến 10% - 25% - 50% - 100%)
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Số câu (Max 10):</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_QUESTION_LIMITS.P2_MAX}
                    value={p2Count}
                    onChange={(e) => setP2Count(Math.min(MAX_QUESTION_LIMITS.P2_MAX, Math.max(0, Number(e.target.value))))}
                    className="w-14 px-2 py-0.5 border rounded bg-white text-center font-bold"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Tổng điểm:</span>
                  <input
                    type="number"
                    step={0.1}
                    value={p2Score}
                    onChange={(e) => setP2Score(Number(e.target.value))}
                    className="w-16 px-2 py-0.5 border rounded bg-white text-center font-bold text-[#1DB954]"
                  />
                </div>
              </div>
            </div>

            {p2Count > 0 ? (
              <div className="space-y-2 pt-2 border-t border-gray-200">
                {Array.from({ length: p2Count }, (_, i) => i + 1).map((qIdx) => (
                  <div key={qIdx} className="flex items-center justify-between bg-white p-2 rounded-xl border">
                    <span className="font-bold text-gray-700 w-14">Câu {qIdx}:</span>
                    <div className="flex space-x-3">
                      {['a', 'b', 'c', 'd'].map((sub) => {
                        const currentVal = p2Keys[qIdx]?.[sub];
                        return (
                          <div key={sub} className="flex items-center space-x-1">
                            <span className="text-gray-500 font-semibold">{sub}:</span>
                            <button
                              type="button"
                              onClick={() => setP2Keys({
                                ...p2Keys,
                                [qIdx]: { ...p2Keys[qIdx], [sub]: true }
                              })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                currentVal === true ? 'bg-[#1DB954] text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              Đ
                            </button>
                            <button
                              type="button"
                              onClick={() => setP2Keys({
                                ...p2Keys,
                                [qIdx]: { ...p2Keys[qIdx], [sub]: false }
                              })}
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                currentVal === false ? 'bg-[#1DB954] text-white' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              S
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-[11px]">Môn học này không có Phần II.</p>
            )}
          </div>

          {/* ===================== 6. CẤU HÌNH PHẦN III ===================== */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="font-bold text-gray-900 text-sm">PHẦN III: Trả lời ngắn</span>
                <span className="text-gray-500 text-[11px] block">
                  Mỗi câu: {p3Count > 0 ? (p3Score / p3Count).toFixed(3) : 0} điểm
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Số câu (Max 20):</span>
                  <input
                    type="number"
                    min={0}
                    max={MAX_QUESTION_LIMITS.P3_MAX}
                    value={p3Count}
                    onChange={(e) => setP3Count(Math.min(MAX_QUESTION_LIMITS.P3_MAX, Math.max(0, Number(e.target.value))))}
                    className="w-14 px-2 py-0.5 border rounded bg-white text-center font-bold"
                  />
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-500">Tổng điểm:</span>
                  <input
                    type="number"
                    step={0.1}
                    value={p3Score}
                    onChange={(e) => setP3Score(Number(e.target.value))}
                    className="w-16 px-2 py-0.5 border rounded bg-white text-center font-bold text-[#1DB954]"
                  />
                </div>
              </div>
            </div>

            {p3Count > 0 ? (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                {Array.from({ length: p3Count }, (_, i) => i + 1).map((qIdx) => (
                  <div key={qIdx} className="flex items-center space-x-1 bg-white p-1.5 rounded-xl border">
                    <span className="font-bold text-[11px] text-gray-600 w-8">C{qIdx}:</span>
                    <input
                      type="text"
                      placeholder="Đáp số..."
                      value={p3Keys[qIdx] || ''}
                      onChange={(e) => setP3Keys({ ...p3Keys, [qIdx]: e.target.value })}
                      className="w-full text-center font-mono font-bold text-gray-800 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-[11px]">Môn học này không có Phần III.</p>
            )}
          </div>

        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSaveExam}
            disabled={isSaving}
            className="px-6 py-2 rounded-full bg-[#1DB954] hover:bg-[#169C46] text-white font-bold shadow-sm transition-all flex items-center space-x-2"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isSaving ? 'Đang tạo...' : 'Tạo kỳ thi'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
