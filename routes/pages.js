const express = require('express');
const router = express.Router();

// ============================================
// 페이지 라우트 (GET)
// ============================================

router.get('/', (req, res) => {
  res.render('index');
});

router.get('/file_manager', (req, res) => {
  res.render('file_manager');
});

router.get('/file_upload', (req, res) => {
  res.render('file_upload');
});

router.get('/folder_upload', (req, res) => {
  res.render('folder_upload');
});

router.get('/vectorstore', (req, res) => {
  res.render('vectorstore');
});

router.get('/file_search', (req, res) => {
  res.render('file_search');
});

module.exports = router;

