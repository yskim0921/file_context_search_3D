const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { testConnection } = require('./db');

// ============================================
// Express 앱 생성
// ============================================
const app = express();

// ============================================
// 설정 (Config)
// ============================================
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const uploadDir = path.join(__dirname, 'public', 'upload', 'files');

// 업로드 디렉토리 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ============================================
// 데이터베이스 연결
// ============================================
testConnection();

// ============================================
// 미들웨어 설정
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// 뷰 엔진 설정
// ============================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// Multer 설정
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 한글 파일명 인코딩 처리
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // 파일명을 안전하게 저장 (특수문자 제거)
    const safeName = originalName.replace(/[^a-zA-Z0-9가-힣\s.-]/g, '');
    cb(null, safeName);
  }
});

// 단일 파일 업로드용 (PDF, TXT, DOCX만 허용)
const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. PDF, TXT, DOCX 파일만 업로드 가능합니다.'));
    }
  }
});

// 폴더 업로드용 (파일 타입 제한 없음)
const folderUpload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE }
});

// ============================================
// 라우트 설정
// ============================================
const pagesRouter = require('./routes/pages');
const apiRouter = require('./routes/api');
const setupUploadRoutes = require('./routes/uploads');

app.use('/', pagesRouter);
app.use('/api', apiRouter);

const uploadRouter = setupUploadRoutes(upload, folderUpload);
app.use('/', uploadRouter);

// AI 검색 결과 HTML 파일 서비스
app.use('/search-results', express.static(path.join(__dirname, 'python', 'rag', 'search')));

// ============================================
// 에러 처리 미들웨어
// ============================================
// 전역 에러 처리
app.use((err, req, res, next) => {
  console.error('🚨 서버 에러 발생:', err);
  
  // Multer 에러 처리
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        message: `파일 크기가 너무 큽니다. ${MAX_FILE_SIZE / (1024 * 1024)}MB 이하의 파일만 업로드 가능합니다.` 
      });
    }
  }
  
  // 파일 업로드 관련 에러인 경우 JSON으로 응답
  if (req.path.includes('/file_upload') || req.path.includes('/folder_upload')) {
    return res.status(500).json({ 
      success: false,
      message: err.message || '서버 오류가 발생했습니다.' 
    });
  }
  
  res.status(500).render('error/500');
});

// 404 에러 처리 (모든 라우트 후)
app.use((req, res) => {
  res.status(404).render('error/404');
});

module.exports = app;

