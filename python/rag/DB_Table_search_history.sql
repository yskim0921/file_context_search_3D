CREATE TABLE IF NOT EXISTS `search_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '검색 ID',
  `query` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '검색 내용',
  `search_result` TEXT COLLATE utf8mb4_unicode_ci COMMENT '검색 결과 내용',
  `ai_answer` TEXT COLLATE utf8mb4_unicode_ci COMMENT 'AI 답변',
  `ranking_result` JSON COMMENT '검색 결과 순위 리스트 (JSON)',
  `html_file_path` VARCHAR(512) COLLATE utf8mb4_unicode_ci COMMENT '3D 시각화 HTML 파일 경로',
  `bar_chart_path` VARCHAR(512) COLLATE utf8mb4_unicode_ci COMMENT 'Bar Chart HTML 파일 경로',
  `chroma_path` VARCHAR(512) COLLATE utf8mb4_unicode_ci COMMENT '사용된 ChromaDB 경로',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '검색 날짜',
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 검색 기록 테이블';

