import React, { useState } from 'react';
import { 
  X, ShieldCheck, Mail, Lock, LogIn, UserPlus, RefreshCw, 
  AlertCircle, Phone, User, CheckCircle2, KeyRound 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TeacherAuthModalProps {
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({ onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Các trường thông tin
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signupSuccessMsg, setSignupSuccessMsg] = useState<string | null>(null);

  // Đánh giá độ mạnh mật khẩu (Password Strength Meter)
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 2) return { level: 'Yếu', color: 'bg-rose-500', text: 'text-rose-500', width: 'w-1/4' };
    if (score <= 4) return { level: 'Trung bình', color: 'bg-amber-500', text: 'text-amber-500', width: 'w-3/4' };
    return { level: 'Rất mạnh', color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' };
  };

  const strength = getPasswordStrength(password);

  // Kiểm tra tính hợp lệ của toàn bộ form trước khi gửi
  const validateForm = () => {
    // 1. Kiểm tra họ tên (Chữ tiếng Việt/Latinh, tối thiểu 3 ký tự, không số/ký tự lạ)
    const nameRegex = /^[a-zA-ZÀ-ỹ\s]{3,50}$/;
    if (!nameRegex.test(fullName.trim())) {
      setErrorMsg('Họ và tên chỉ được chứa chữ cái, tối thiểu 3 ký tự (Ví dụ: Nguyễn Văn A).');
      return false;
    }

    // 2. Kiểm tra số điện thoại Việt Nam (10 số, đầu 03, 05, 07, 08, 09)
    const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      setErrorMsg('Số điện thoại không hợp lệ (Cần đủ 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09).');
      return false;
    }

    // 3. Kiểm tra email chuẩn
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Định dạng địa chỉ Email không hợp lệ.');
      return false;
    }

    // 4. Kiểm tra mật khẩu mạnh (tối thiểu 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt)
    const strongPassRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPassRegex.test(password)) {
      setErrorMsg('Mật khẩu phải có tối thiểu 8 ký tự, bao gồm ít nhất 1 chữ hoa, 1 chữ thường, 1 chữ số và 1 ký tự đặc biệt (@$!%*?&...).');
      return false;
    }

    // 5. Kiểm tra xác nhận mật khẩu
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp với mật khẩu đã nhập.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSignupSuccessMsg(null);

    if (isSignUp) {
      if (!validateForm()) return;

      setIsLoading(true);
      try {
        // Kiểm tra chống trùng số điện thoại trong cơ sở dữ liệu
        const { data: existingPhone } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('phone', phone.trim())
          .maybeSingle();

        if (existingPhone) {
          throw new Error('Số điện thoại này đã được đăng ký cho một tài khoản khác. Vui lòng sử dụng số điện thoại của bạn.');
        }

        // Sinh mã định danh giáo viên duy nhất (Teacher ID)
        const teacherCode = `GV-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        // Đăng ký qua Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              teacher_code: teacherCode,
              role: 'teacher',
            }
          }
        });

        if (authError) throw authError;

        // Lưu thông tin khách hàng bảo vệ vào bảng teacher_profiles
        if (authData.user) {
          await supabase.from('teacher_profiles').insert({
            id: authData.user.id,
            teacher_code: teacherCode,
            full_name: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
          });
        }

        setSignupSuccessMsg(
          `Đăng ký tài khoản thành công! Hệ thống đã gửi email kích hoạt tới "${email.trim()}". Thầy/Cô vui lòng mở hộp thư (kiểm tra cả mục Thư rác/Spam) và nhấn vào liên kết xác nhận trước khi đăng nhập.`
        );
      } catch (err: any) {
        setErrorMsg(err.message || 'Lỗi khi tạo tài khoản.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Đăng nhập
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Tài khoản chưa được kích hoạt qua email. Vui lòng kiểm tra hộp thư của bạn để xác nhận.');
          }
          throw error;
        }

        if (data.user) {
          onSuccess(data.user);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Email hoặc mật khẩu không chính xác.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Đăng nhập bằng Google
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
      if (err.message?.includes('provider is not enabled')) {
        setErrorMsg('Chưa kích hoạt Google OAuth trên Supabase. Thầy/Cô vui lòng sử dụng Email & Mật khẩu bên trên để đăng nhập.');
      } else {
        setErrorMsg('Lỗi đăng nhập Google: ' + err.message);
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* HEADER */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-[#1DB954] flex items-center justify-center text-white font-extrabold shadow-sm flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg text-gray-900 leading-tight">
              {isSignUp ? 'Đăng Ký Tài Khoản Giáo Viên' : 'Xác Thực Giáo Viên'}
            </h3>
            <p className="text-xs text-gray-500">
              Quản trị đề thi & bảo vệ dữ liệu học sinh
            </p>
          </div>
        </div>

        {/* THÔNG BÁO LỖI */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-start space-x-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* THÔNG BÁO ĐĂNG KÝ THÀNH CÔNG YÊU CẦU XÁC NHẬN EMAIL */}
        {signupSuccessMsg ? (
          <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#1DB954] mx-auto" />
            <h4 className="font-bold text-sm text-[#15803D]">Đăng ký thành công!</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {signupSuccessMsg}
            </p>
            <button
              type="button"
              onClick={() => {
                setSignupSuccessMsg(null);
                setIsSignUp(false);
              }}
              className="w-full bg-[#1DB954] text-white py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-[#169C46] transition-all"
            >
              Chuyển sang Đăng nhập
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* CÁC TRƯỜNG CHỈ DÀNH CHO ĐĂNG KÝ */}
            {isSignUp && (
              <>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Họ và tên giáo viên * <span className="font-normal text-gray-400">(Tối thiểu 3 chữ cái)</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="VD: Nguyễn Văn A"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Số điện thoại * <span className="font-normal text-gray-400">(10 chữ số)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="VD: 0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}

            {/* EMAIL */}
            <div>
              <label className="font-bold text-gray-700 block mb-1">Email giáo viên *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700">Mật khẩu *</label>
                {isSignUp && password && (
                  <span className={`text-[10px] font-bold ${strength.text}`}>
                    Độ mạnh: {strength.level}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder={isSignUp ? "Tối thiểu 8 ký tự (hoa, thường, số, ký tự đặc biệt)" : "Nhập mật khẩu"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1DB954] focus:bg-white focus:outline-none transition-all"
                />
              </div>
              {/* Thanh đo độ mạnh mật khẩu */}
              {isSignUp && password && (
                <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                  <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`} />
                </div>
              )}
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            {isSignUp && (
              <div>
                <label className="font-bold text-gray-700 block mb-1">Xác nhận lại mật khẩu *</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu giống bên trên"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl focus:outline-none transition-all ${
                      confirmPassword && password !== confirmPassword
                        ? 'border-rose-300 focus:border-rose-500'
                        : 'border-gray-200 focus:border-[#1DB954] focus:bg-white'
                    }`}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-[10px] text-rose-600 mt-1 font-medium">Mật khẩu xác nhận chưa khớp.</p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#1DB954] hover:bg-[#169C46] active:scale-[0.98] text-white py-3 rounded-xl font-bold text-xs md:text-sm shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo tài khoản giáo viên</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập trang quản trị</span>
                </>
              )}
            </button>
          </form>
        )}

        {!signupSuccessMsg && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400 font-semibold text-[11px]">HOẶC</span>
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

            <div className="mt-4 text-center text-xs text-gray-500">
              {isSignUp ? (
                <p>
                  Đã có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setIsSignUp(false);
                    }}
                    className="text-[#1DB954] font-bold hover:underline"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              ) : (
                <p>
                  Chưa có tài khoản giáo viên?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setIsSignUp(true);
                    }}
                    className="text-[#1DB954] font-bold hover:underline"
                  >
                    Đăng ký miễn phí
                  </button>
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
