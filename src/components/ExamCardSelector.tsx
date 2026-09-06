import React from 'react';
import { Clock, User, Calendar, CheckCircle2, Lock, AlertCircle } from 'lucide-react';
import { SUBJECT_PRESETS } from '../constants/subjectPresets';
import { Exam } from '../types/exam';

interface ExamCardSelectorProps {
  exams: Exam[];
  selectedId: string;
  onSelect: (examId: string) => void;
}

export const ExamCardSelector: React.FC<ExamCardSelectorProps> = ({
  exams,
  selectedId,
  onSelect,
}) => {
  const now = new Date();

  const formatDateTime = (isoStr?: string | null) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const time = ;
    const date = ;
    return ;
  };

  if (exams.length === 0) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-xs">
        <p>Hiện chưa có kỳ thi nào được mở trên hệ thống.</p>
        <p className="text-[11px] mt-1 text-gray-400">Vui lòng chờ giáo viên tạo đề thi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
      {exams.map((ex) => {
        const isSelected = selectedId === ex.id;
        const startDate = ex.start_at ? new Date(ex.start_at) : null;
        const endDate = ex.end_at ? new Date(ex.end_at) : null;

        const isNotStarted = startDate ? now < startDate : false;
        const isExpired = endDate ? now > endDate : false;
        const isOpen = !isNotStarted && !isExpired;

        const preset = SUBJECT_PRESETS[ex.subject];
        const badgeColor = preset?.badge || 'bg-gray-100 text-gray-700 border-gray-200';

        return (
          <button
            type="button"
            key={ex.id}
            disabled={!isOpen}
            onClick={() => isOpen && onSelect(ex.id)}
            className={}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={}>
                {ex.subject}
              </span>
              <div className="flex items-center space-x-1 text-xs text-gray-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>{ex.duration_minutes} phút</span>
              </div>
            </div>

            <h4 className="font-extrabold text-sm text-gray-900 leading-snug mb-2">
              {ex.title}
            </h4>

            <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2.5 border-t border-gray-100">
              <div className="flex items-center space-x-1 truncate max-w-[180px]">
                <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="truncate">Giao bởi: <b className="text-gray-700">{ex.teacher_name || 'Giáo viên'}</b></span>
              </div>

              <div>
                {isNotStarted ? (
                  <span className="inline-flex items-center space-x-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-amber-200">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Mở: {formatDateTime(ex.start_at)}</span>
                  </span>
                ) : isExpired ? (
                  <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-rose-200">
                    <AlertCircle className="w-2.5 h-2.5" />
                    <span>Đã đóng: {formatDateTime(ex.end_at)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-[#15803D] bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                    <span>Đang mở</span>
                  </span>
                )}
              </div>
            </div>

            {isOpen && endDate && (
              <div className="mt-2 text-[10px] text-gray-400 flex items-center space-x-1 font-medium">
                <Calendar className="w-3 h-3 text-gray-400" />
                <span>Hạn chót: {formatDateTime(ex.end_at)}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
