import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, LogIn, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeacherAuthModalProps {
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({ onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: displayName.trim() || 'Giáo viên',
              role: 'teacher',
            }
          }
        });

        if (error) throw error;
        if (data.user) {
          alert('Đăng ký thành công! Vui lòng đăng nhập.');
          setIsSignUp(false);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        if (data.user) {
          onSuccess(data.user);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đã có lỗi xảy ra trong quá trình xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg('Lỗi đăng nhập Google: ' + err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954] flex items-center justify-center text-white font-extrabold shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg text-gray-900 leading-tight">
              {isSignUp ? 'Đăng Ký Tài Khoản Giáo Viên' : 'Xác Thực Giáo Viên'}
            </h3>
            <p className="text-xs text-gray-500">
              Quản trị đề thi & bảng điểm bảo mật
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 text-xs">
          {isSignUp && (
            <div>
              <label className="font-bold text-gray-700 block mb-1">Họ tên hiển thị (Thầy/Cô) *</label>
              <input
                type="text"
                required
                placeholder="VD: Thầy Nguyễn Văn Huy"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          )}

          <div>
            <label className="font-bold text-gray-700 block mb-1">Email giáo viên *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="teacher@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-gray-700 block mb-1">Mật khẩu *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Tối thiểu 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-[#1DB954] hover:bg-[#169C46] active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập</span>
              </>
            )}
          </button>
        </form>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-3 bg-white text-gray-400 font-semibold">HOẶC</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 py-2.5 rounded-xl font-bold text-xs text-gray-700 transition-all flex items-center justify-center space-x-2.5 shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Đăng nhập với Google</span>
        </button>

        <div className="mt-5 text-center text-xs text-gray-500">
          {isSignUp ? (
            <p>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[#1DB954] font-bold hover:underline"
              >
                Đăng nhập
              </button>
            </p>
          ) : (
            <p>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-[#1DB954] font-bold hover:underline"
              >
                Đăng ký miễn phí
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
