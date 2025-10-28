const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');

// ollama 서버 체크 함수
function checkOllamaServer() {
  return new Promise((resolve) => {
    exec('ps aux | grep ollama | grep -v grep', (error, stdout, stderr) => {
      if (error || !stdout || stdout.trim().length === 0) {
        resolve(false); // ollama 서버가 실행 중이 아님
      } else {
        resolve(true); // ollama 서버가 실행 중
      }
    });
  });
}

// Multer 설정 (외부에서 주입받음)
function setupUploadRoutes(upload, folderUpload) {
  
  // ollama 체크 미들웨어
  const checkOllamaMiddleware = async (req, res, next) => {
    const isOllamaRunning = await checkOllamaServer();
    if (!isOllamaRunning) {
      console.log('❌ 파일 업로드 차단: Ollama 서버가 꺼져 있습니다.');
      return res.status(500).json({ 
        success: false,
        message: 'Ollama 서버가 꺼져 있습니다. Ollama 서버를 실행한 후 다시 시도해주세요.',
        ollamaError: true
      });
    }
    next();
  };
  
  // ============================================
  // 파일 업로드 라우트 (POST)
  // ============================================
  
  // 단일 파일 업로드
  router.post('/file_upload', checkOllamaMiddleware, upload.single('file'), async (req, res) => {
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: '파일이 업로드되지 않았습니다.' 
      });
    }
    
    // 한글 파일명 인코딩 처리
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    
    res.json({
      success: true,
      message: '파일이 성공적으로 업로드되었습니다.',
      file: {
        originalName: originalName,
        filename: req.file.filename,
        size: req.file.size,
        path: req.file.path
      }
    });
  });

  // 폴더 업로드 (여러 파일)
  router.post('/folder_upload', checkOllamaMiddleware, folderUpload.array('files'), async (req, res) => {
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: '파일이 업로드되지 않았습니다.' 
      });
    }
    
    const uploadedFiles = req.files.map(file => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      return {
        originalName: originalName,
        filename: file.filename,
        size: file.size,
        path: file.path
      };
    });
    
    res.json({
      success: true,
      message: `${uploadedFiles.length}개의 파일이 성공적으로 업로드되었습니다.`,
      files: uploadedFiles
    });
  });

  return router;
}

module.exports = setupUploadRoutes;

