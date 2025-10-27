const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer 설정 (외부에서 주입받음)
function setupUploadRoutes(upload, folderUpload) {
  // ============================================
  // 파일 업로드 라우트 (POST)
  // ============================================
  
  // 단일 파일 업로드
  router.post('/file_upload', upload.single('file'), (req, res) => {
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
  router.post('/folder_upload', folderUpload.array('files'), (req, res) => {
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

