CREATE TABLE `documents` (
  `id` int unsigned NOT NULL AUTO_INCREMENT COMMENT '아이디',
  `title` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '제목',
  `summary` text COLLATE utf8mb4_unicode_ci COMMENT '요약',
  `keywords` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '중요단어',
  `file_location` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일위치',
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '파일명',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '만든날짜',
  `doc_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=301 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='요약문서 테이블';