-- ====================================================================
-- HỆ THỐNG CƠ SỞ DỮ LIỆU & HÀM CHẤM ĐIỂM CHUẨN THPTQG 2025 (BẢN FIX TRIỆT ĐỂ)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Bảng KỲ THI (exams)
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(50) DEFAULT 'Toán',
    pdf_url TEXT NOT NULL,
    config JSONB NOT NULL,             -- Cấu trúc các phần câu hỏi (Part 1, 2, 3)
    answer_keys JSONB NOT NULL,        -- BẢO MẬT: Đáp án chuẩn của giáo viên
    duration_minutes INT DEFAULT 90,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tạo VIEW công khai cho học sinh (Loại bỏ cột answer_keys để chống F12)
CREATE OR REPLACE VIEW public_exams AS
SELECT id, title, subject, pdf_url, config, duration_minutes, is_active, created_at
FROM exams;

-- 3. Bảng BÀI LÀM (submissions)
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_name VARCHAR(100) NOT NULL,
    class_name VARCHAR(50) NOT NULL,
    session_token UUID NOT NULL,       -- Mã nhận diện thiết bị học sinh
    answers JSONB DEFAULT '{}',        -- Bài làm học sinh
    score NUMERIC(4, 2) DEFAULT NULL,  -- Điểm tổng (0 - 10)
    score_details JSONB DEFAULT '{}',  -- Chi tiết điểm từng câu
    cheat_count INT DEFAULT 0,         -- Số lần chuyển tab
    total_away_seconds INT DEFAULT 0,  -- Tổng thời gian rời màn hình
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress' hoặc 'submitted'
    started_at TIMESTAMPTZ DEFAULT now(),
    submitted_at TIMESTAMPTZ DEFAULT NULL,
    CONSTRAINT unique_exam_session UNIQUE (exam_id, session_token)
);

-- Bật Realtime cho bảng submissions
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;

-- 4. Bật Row Level Security (RLS) & Phân quyền đầy đủ
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Cấp quyền Đọc, Thêm, Xóa cho exams
DROP POLICY IF EXISTS "Cho phép đọc exams" ON exams;
CREATE POLICY "Cho phép đọc exams" ON exams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép thêm exams" ON exams;
CREATE POLICY "Cho phép thêm exams" ON exams FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép xóa exams" ON exams;
CREATE POLICY "Cho phép xóa exams" ON exams FOR DELETE USING (true);

-- Cấp quyền Đọc, Thêm, Cập nhật, Xóa cho submissions
DROP POLICY IF EXISTS "Cho phép đọc submissions" ON submissions;
CREATE POLICY "Cho phép đọc submissions" ON submissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cho phép chèn submissions" ON submissions;
CREATE POLICY "Cho phép chèn submissions" ON submissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép cập nhật submissions" ON submissions;
CREATE POLICY "Cho phép cập nhật submissions" ON submissions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Cho phép xóa submissions" ON submissions;
CREATE POLICY "Cho phép xóa submissions" ON submissions FOR DELETE USING (true);

-- 5. HÀM CHẤM ĐIỂM CHUẨN THPTQG 2025 (Chạy an toàn trên Server qua RPC - Đã fix lỗi ép kiểu & khoảng trắng)
CREATE OR REPLACE FUNCTION submit_and_grade_exam(
    p_exam_id UUID,
    p_session_token UUID,
    p_student_name TEXT,
    p_class_name TEXT,
    p_answers JSONB,
    p_cheat_count INT,
    p_total_away_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_keys JSONB;
    v_config JSONB;
    v_total_score NUMERIC(4,2) := 0.0;
    v_score_details JSONB := '{"part_1":{},"part_2":{},"part_3":{}}'::jsonb;
    
    v_q_idx INT;
    v_p1_key TEXT;
    v_p1_ans TEXT;
    
    v_sub TEXT;
    v_sub_items TEXT[] := ARRAY['a', 'b', 'c', 'd'];
    v_correct_sub_count INT;
    v_p2_score NUMERIC(4,2);
    v_p2_sub_details JSONB;
    v_ans_sub TEXT;
    v_key_sub TEXT;
    
    v_clean_key TEXT;
    v_clean_ans TEXT;
    v_p1_count INT;
    v_p2_count INT;
    v_p3_count INT;
BEGIN
    -- Lấy đáp án và cấu hình
    SELECT answer_keys, config INTO v_keys, v_config
    FROM exams WHERE id = p_exam_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Kỳ thi không tồn tại hoặc đã đóng.';
    END IF;

    -- Xác định số câu hỏi linh hoạt
    v_p1_count := COALESCE((v_config->'sections'->0->>'question_count')::int, (v_config->'part_1'->>'question_count')::int, 12);
    v_p2_count := COALESCE((v_config->'sections'->1->>'question_count')::int, (v_config->'part_2'->>'question_count')::int, 4);
    v_p3_count := COALESCE((v_config->'sections'->2->>'question_count')::int, (v_config->'part_3'->>'question_count')::int, 6);

    -- =================== CHẤM PHẦN I: TRẮC NGHIỆM ĐƠN (0.25đ / câu) ===================
    FOR v_q_idx IN 1..v_p1_count LOOP
        v_p1_key := UPPER(TRIM(COALESCE(v_keys->'part_1'->>v_q_idx::text, '')));
        v_p1_ans := UPPER(TRIM(COALESCE(p_answers->'part_1'->>v_q_idx::text, '')));
        
        IF v_p1_ans <> '' AND v_p1_ans = v_p1_key THEN
            v_total_score := v_total_score + 0.25;
            v_score_details := jsonb_set(v_score_details, ARRAY['part_1', v_q_idx::text], 
                jsonb_build_object('is_correct', true, 'score', 0.25, 'student_ans', v_p1_ans, 'key', v_p1_key));
        ELSE
            v_score_details := jsonb_set(v_score_details, ARRAY['part_1', v_q_idx::text], 
                jsonb_build_object('is_correct', false, 'score', 0, 'student_ans', v_p1_ans, 'key', v_p1_key));
        END IF;
    END LOOP;

    -- =================== CHẤM PHẦN II: ĐÚNG SAI (Thang lũy tiến 0.1 - 0.25 - 0.5 - 1.0) ===================
    FOR v_q_idx IN 1..v_p2_count LOOP
        v_correct_sub_count := 0;
        v_p2_sub_details := '{}'::jsonb;

        FOREACH v_sub IN ARRAY v_sub_items LOOP
            -- Trích xuất chính xác chuỗi text 'true' hoặc 'false' (tránh triệt để lỗi ép kiểu jsonb)
            v_ans_sub := LOWER(TRIM(COALESCE(p_answers->'part_2'->v_q_idx::text->>v_sub, '')));
            v_key_sub := LOWER(TRIM(COALESCE(v_keys->'part_2'->v_q_idx::text->>v_sub, '')));

            IF v_ans_sub <> '' AND v_ans_sub = v_key_sub THEN
                v_correct_sub_count := v_correct_sub_count + 1;
                v_p2_sub_details := jsonb_set(v_p2_sub_details, ARRAY[v_sub], 'true'::jsonb);
            ELSE
                v_p2_sub_details := jsonb_set(v_p2_sub_details, ARRAY[v_sub], 'false'::jsonb);
            END IF;
        END LOOP;

        CASE v_correct_sub_count
            WHEN 1 THEN v_p2_score := 0.10;
            WHEN 2 THEN v_p2_score := 0.25;
            WHEN 3 THEN v_p2_score := 0.50;
            WHEN 4 THEN v_p2_score := 1.00;
            ELSE v_p2_score := 0.00;
        END CASE;

        v_total_score := v_total_score + v_p2_score;
        v_score_details := jsonb_set(v_score_details, ARRAY['part_2', v_q_idx::text], 
            jsonb_build_object('correct_count', v_correct_sub_count, 'score', v_p2_score, 'details', v_p2_sub_details));
    END LOOP;

    -- =================== CHẤM PHẦN III: TRẢ LỜI NGẮN (0.5đ / câu) ===================
    FOR v_q_idx IN 1..v_p3_count LOOP
        -- Xóa sạch mọi khoảng trắng ở bất kỳ vị trí nào, đổi dấu phẩy thành dấu chấm
        v_clean_key := REPLACE(REGEXP_REPLACE(COALESCE(v_keys->'part_3'->>v_q_idx::text, ''), '\s+', '', 'g'), ',', '.');
        v_clean_ans := REPLACE(REGEXP_REPLACE(COALESCE(p_answers->'part_3'->>v_q_idx::text, ''), '\s+', '', 'g'), ',', '.');

        -- Bỏ dấu cộng ở đầu nếu có (+5 -> 5)
        v_clean_key := REGEXP_REPLACE(v_clean_key, '^\+', '');
        v_clean_ans := REGEXP_REPLACE(v_clean_ans, '^\+', '');

        IF v_clean_ans <> '' AND (
            v_clean_ans = v_clean_key 
            OR (
                v_clean_ans ~ '^-?[0-9]+(\.[0-9]+)?$' 
                AND v_clean_key ~ '^-?[0-9]+(\.[0-9]+)?$' 
                AND v_clean_ans::numeric = v_clean_key::numeric
            )
        ) THEN
            v_total_score := v_total_score + 0.50;
            v_score_details := jsonb_set(v_score_details, ARRAY['part_3', v_q_idx::text], 
                jsonb_build_object('is_correct', true, 'score', 0.50, 'student_ans', v_clean_ans, 'key', v_clean_key));
        ELSE
            v_score_details := jsonb_set(v_score_details, ARRAY['part_3', v_q_idx::text], 
                jsonb_build_object('is_correct', false, 'score', 0, 'student_ans', v_clean_ans, 'key', v_clean_key));
        END IF;
    END LOOP;

    -- Lưu kết quả vào bảng submissions
    INSERT INTO submissions (
        exam_id, session_token, student_name, class_name,
        answers, score, score_details, cheat_count, total_away_seconds, status, submitted_at
    ) VALUES (
        p_exam_id, p_session_token, p_student_name, p_class_name,
        p_answers, v_total_score, v_score_details, p_cheat_count, p_total_away_seconds, 'submitted', now()
    )
    ON CONFLICT (exam_id, session_token)
    DO UPDATE SET
        answers = EXCLUDED.answers,
        score = EXCLUDED.score,
        score_details = EXCLUDED.score_details,
        cheat_count = EXCLUDED.cheat_count,
        total_away_seconds = EXCLUDED.total_away_seconds,
        status = 'submitted',
        submitted_at = now();

    RETURN jsonb_build_object(
        'status', 'success',
        'score', v_total_score,
        'score_details', v_score_details,
        'answer_keys', v_keys
    );
END;
$$;
