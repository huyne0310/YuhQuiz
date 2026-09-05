# KhaoThiPro - Nền Tảng Thi Trực Tuyến THPTQG 2025 (Spotify Light Aesthetic)

Hệ thống thi trắc nghiệm trực tuyến tinh gọn, tối ưu theo quy chế đề thi mới của Bộ Giáo dục & Đào tạo từ năm 2025.
Giao diện chia đôi màn hình (Split-view) kéo thả mượt mà, hỗ trợ đọc đề file PDF và điền phiếu thi phong cách Spotify Light Theme.

---

## 1. Cấu trúc Dự Án

```
exam-platform/
├── src/
│   ├── components/
│   │   ├── StudentExamRoom.tsx      # Phòng thi học sinh (Split view, Timer, Anti-cheat, Review)
│   │   ├── TeacherDashboard.tsx     # Trung tâm giám sát realtime, bảng điểm của giáo viên
│   │   └── CreateExamModal.tsx      # Modal tạo đề thi, upload PDF, nhập đáp án
│   ├── hooks/
│   │   ├── useExamTimer.ts          # Đếm ngược neo thời gian thực chống tua giờ
│   │   ├── useAntiCheat.ts          # Giám sát rời tab có bộ lọc nhiễu Unikey/click nhầm
│   │   └── useAutoSave.ts           # Tự động lưu LocalStorage 0ms & Debounce Server
│   ├── utils/
│   │   └── scoring.ts               # Thuật toán chấm điểm chuẩn THPTQG 2025 (100% test pass)
│   ├── lib/
│   │   └── supabase.ts              # Kết nối Supabase BaaS
│   ├── types/
│   │   └── exam.ts                  # TypeScript Interfaces
│   ├── App.tsx                      # Trang chủ điều hướng Học sinh & Giáo viên
│   ├── main.tsx & index.css         # Khởi tạo React & Tailwind CSS
├── supabase/
│   └── schema.sql                   # Mã SQL tạo Database, RLS, Storage và RPC Function
├── tests/
│   └── test_scoring.js              # Bộ kiểm thử đơn vị Unit test thuật toán
├── package.json & vite.config.ts
└── .env.example
```

---

## 2. Hướng Dẫn Cài Đặt & Chạy Thử Trên Máy (Local)

### Bước 1: Cài đặt thư viện
```bash
cd exam-platform
npm install
```

### Bước 2: Chạy kiểm thử tự động
```bash
npm run test
# Kết quả: Tất cả 4 bộ kiểm thử đạt 100% độ chính xác
```

### Bước 3: Cấu hình biến môi trường
Tạo file `.env` từ `.env.example`:
```bash
cp .env.example .env
```
Điền URL và Anon Key lấy từ Supabase (xem mục 3 bên dưới).

### Bước 4: Chạy môi trường phát triển
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:5173`

---

## 3. Hướng Dẫn Triển Khai Miễn Phí 100% (Supabase + Vercel)

### Bước A: Tạo Backend trên Supabase (2 phút)
1. Truy cập [https://supabase.com](https://supabase.com) và đăng ký tài khoản miễn phí.
2. Tạo một Project mới (chọn Region Singapore để tốc độ tại Việt Nam nhanh nhất).
3. Vào mục **SQL Editor** bên thanh menu trái -> Chọn **New Query** -> Dán toàn bộ nội dung file `supabase/schema.sql` vào rồi ấn **RUN**.
4. Vào mục **Storage** -> Tạo một Bucket mới đặt tên là `exam-pdfs` và tích chọn **Public bucket**.
5. Vào **Project Settings** -> **API** -> Sao chép 2 thông số:
   - `Project URL`
   - `Project API keys (anon public)`

### Bước B: Triển Khai Frontend Lên Vercel (1 phút)
1. Đẩy mã nguồn lên GitHub của bạn:
   ```bash
   git init
   git add .
   git commit -m "Initial commit KhaoThiPro"
   git branch -M main
   git remote add origin <link_github_cua_ban>
   git push -u origin main
   ```
2. Truy cập [https://vercel.com](https://vercel.com) -> Đăng nhập bằng GitHub.
3. Chọn **Add New...** -> **Project** -> Chọn Repository vừa đẩy lên.
4. Ở phần **Environment Variables**, thêm 2 biến:
   - `VITE_SUPABASE_URL`: (Dán Project URL từ Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (Dán anon key từ Supabase)
5. Nhấn **Deploy**. Sau ~40 giây, bạn sẽ nhận được đường link web chính thức có đuôi `.vercel.app` (miễn phí trọn đời, hỗ trợ HTTPS tự động).
