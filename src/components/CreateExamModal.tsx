import React, { useState } from 'react';
import { X, Upload, Check, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CreateExamModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateExamModal: React.FC<CreateExamModalProps> = ({ onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Toán');
  const [duration, setDuration] = useState(90);
  const [pdfUrl, setPdfUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cấu hình số lượng câu
  const [p1Count, setP1Count] = useState(12);
  const [p2Count, setP2Count] = useState(4);
  const [p3Count, setP3Count] = useState(6);

  // Đáp án chuẩn
  const [p1Keys, setP1Keys] = useState<Record<number, string>>({});
  const [p2Keys, setP2Keys] = useState<Record<number, Record<string, boolean>>>({});
  const [p3Keys, setP3Keys] = useState<Record<number, string>>({});

  // Xử lý upload file PDF lên Supabase Storage
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('exam-pdfs')
        .upload(fileName, file);

      if (error) throw error;

      // Lấy link public
      const { data: publicUrlData } = supabase.storage
        .from('exam-pdfs')
        .getPublicUrl(fileName);

      setPdfUrl(publicUrlData.publicUrl);
    } catch (err: any) {
      alert('Không thể tải file lên Storage: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Lưu đề thi vào Supabase
  const handleSaveExam = async () => {
    if (!title.trim() || !pdfUrl.trim()) {
      alert('Vui lòng nhập tiêu đề đề thi và cung cấp file PDF!');
      return;
    }

    setIsSaving(true);
    try {
      const config = {
        sections: [
          { id: 'part_1', title: 'PHẦN I. Trắc nghiệm 4 lựa chọn', type: 'single_choice', question_count: p1Count, points_per_question: 0.25 },
          { id: 'part_2', title: 'PHẦN II. Trắc nghiệm Đúng / Sai', type: 'true_false_group', question_count: p2Count, scoring_rule: 'thptqg_progressive_2025' },
          { id: 'part_3', title: 'PHẦN III. Trả lời ngắn', type: 'short_answer', question_count: p3Count, points_per_question: 0.5 },
        ]
      };

      const answerKeys = {
        part_1: p1Keys,
        part_2: p2Keys,
        part_3: p3Keys,
      };

      const { error } = await supabase.from('exams').insert({
        title,
        subject,
        duration_minutes: duration,
        pdf_url: pdfUrl,
        config,
        answer_keys: answerKeys,
        is_active: true,
      });

      if (error) throw error;
      alert('Đã tạo đề thi thành công!');
      onSuccess();
    } catch (err: any) {
      alert('Lỗi lưu đề thi: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center pb-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Tạo Kỳ Thi & Thiết Lập Đáp Án Chuẩn</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 text-xs">
          
          {/* 1. THÔNG TIN CƠ BẢN */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-semibold text-gray-700 block mb-1">Tên kỳ thi / Đề thi *</label>
              <input
                type="text"
                placeholder="VD: Đề Khảo sát Chất lượng Đầu vào Môn Toán"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Môn học</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
            </div>
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Thời gian làm bài (Phút)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
            </div>
          </div>

          {/* 2. UPLOAD FILE PDF */}
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Đường dẫn file đề PDF *</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Dán link PDF hoặc tải file lên..."
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-xl focus:border-[#1DB954] focus:outline-none"
              />
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-semibold flex items-center space-x-1.5 transition-all">
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-[#1DB954]" /> : <Upload className="w-4 h-4 text-gray-600" />}
                <span>{isUploading ? 'Đang tải...' : 'Upload PDF'}</span>
                <input type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* 3. NHẬP ĐÁP ÁN PHẦN I */}
          <div className="bg-gray-50 p-4 rounded-2xl border">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-800">PHẦN I: Trắc nghiệm 4 phương án</span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Số câu:</span>
                <input
                  type="number"
                  value={p1Count}
                  onChange={(e) => setP1Count(Number(e.target.value))}
                  className="w-14 px-2 py-0.5 border rounded bg-white text-center"
                />
              </div>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: p1Count }, (_, i) => i + 1).map((qIdx) => (
                <div key={qIdx} className="flex items-center space-x-1 bg-white p-1 rounded border">
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
          </div>

          {/* 4. NHẬP ĐÁP ÁN PHẦN II */}
          <div className="bg-gray-50 p-4 rounded-2xl border">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-800">PHẦN II: Trắc nghiệm Đúng / Sai</span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Số câu:</span>
                <input
                  type="number"
                  value={p2Count}
                  onChange={(e) => setP2Count(Number(e.target.value))}
                  className="w-14 px-2 py-0.5 border rounded bg-white text-center"
                />
              </div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: p2Count }, (_, i) => i + 1).map((qIdx) => (
                <div key={qIdx} className="flex items-center justify-between bg-white p-2 rounded-lg border">
                  <span className="font-bold text-gray-700 w-12">Câu {qIdx}:</span>
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
          </div>

          {/* 5. NHẬP ĐÁP ÁN PHẦN III */}
          <div className="bg-gray-50 p-4 rounded-2xl border">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-gray-800">PHẦN III: Trả lời ngắn</span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">Số câu:</span>
                <input
                  type="number"
                  value={p3Count}
                  onChange={(e) => setP3Count(Number(e.target.value))}
                  className="w-14 px-2 py-0.5 border rounded bg-white text-center"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: p3Count }, (_, i) => i + 1).map((qIdx) => (
                <div key={qIdx} className="flex items-center space-x-1 bg-white p-1.5 rounded border">
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
          </div>

        </div>

        {/* MODAL FOOTER */}
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
            <span>{isSaving ? 'Đang lưu...' : 'Tạo kỳ thi'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
