CREATE TABLE vectorStore (
    id INT AUTO_INCREMENT PRIMARY KEY,     -- 순서대로 자동 증가
    folder VARCHAR(255) NOT NULL,          -- 폴더명 (예: rag_chroma/documents/20251024_153000)
    count INT NOT NULL,                    -- 문서 수량
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 문서 생성 날짜 (자동 입력)
);