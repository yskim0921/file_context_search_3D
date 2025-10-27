const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { query } = require('../db');

// ============================================
// API 라우트
// ============================================

// 업로드된 파일 목록 가져오기
router.get('/files', (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '..', 'public', 'upload', 'files');
    const files = fs.readdirSync(uploadDir);
    const fileList = files.map(file => {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        size: stats.size,
        uploadDate: stats.mtime
      };
    });
    
    // 최신순으로 정렬 (업로드 날짜 기준 내림차순)
    fileList.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    
    res.json({ success: true, files: fileList });
  } catch (error) {
    res.status(500).json({ success: false, message: '파일 목록을 가져오는데 실패했습니다.' });
  }
});

// Python 스크립트 실행 API (conda 환경 사용)
router.post('/run-python', express.json(), (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ 
      success: false,
      message: '파일 경로가 제공되지 않았습니다.' 
    });
  }
  
  const pythonScript = path.join(__dirname, '..', 'python', 'upload', 'file_upload.py');
  
  // 파일 경로를 절대 경로로 변환
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
  
  // conda 환경(file_upload)에서 Python 스크립트 실행
  const command = `conda run -n file_upload python "${pythonScript}" "${absoluteFilePath}"`;
  
  console.log('Python 스크립트 실행:', command);
  console.log('파일 경로:', absoluteFilePath);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Python 스크립트 실행 오류:', error);
      return res.status(500).json({ 
        success: false,
        message: '파일 처리 중 오류가 발생했습니다.',
        error: error.message,
        stderr: stderr
      });
    }
    
    console.log('Python 출력:', stdout);
    if (stderr) {
      console.error('Python 에러:', stderr);
    }
    
    res.json({
      success: true,
      message: '파일이 성공적으로 처리되었습니다.',
      output: stdout
    });
  });
});

// 폴더 업로드용 Python 스크립트 실행 API (conda 환경 사용)
router.post('/run-folder-python', express.json(), (req, res) => {
  console.log('📬 폴더 Python API 호출됨');
  console.log('Request body:', req.body);
  
  const { folderPath } = req.body;
  
  if (!folderPath) {
    console.log('❌ 폴더 경로 없음');
    return res.status(400).json({ 
      success: false,
      message: '폴더 경로가 제공되지 않았습니다.' 
    });
  }
  
  const pythonScript = path.join(__dirname, '..', 'python', 'upload', 'folder_upload.py');
  
  // 폴더 경로를 절대 경로로 변환
  const absoluteFolderPath = path.isAbsolute(folderPath) ? folderPath : path.join(__dirname, '..', folderPath);
  
  // conda 환경(file_upload)에서 Python 스크립트 실행
  const command = `conda run -n file_upload python "${pythonScript}" "${absoluteFolderPath}"`;
  
  console.log('🚀 Python 폴더 스크립트 실행:', command);
  console.log('📁 폴더 경로:', absoluteFolderPath);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Python 스크립트 실행 오류:', error);
      return res.status(500).json({ 
        success: false,
        message: '폴더 처리 중 오류가 발생했습니다.',
        error: error.message,
        stderr: stderr
      });
    }
    
    console.log('Python 출력:', stdout);
    if (stderr) {
      console.error('Python 에러:', stderr);
    }
    
    res.json({
      success: true,
      message: '폴더가 성공적으로 처리되었습니다.',
      output: stdout
    });
  });
});

// 벡터스토어 생성 API (conda 환경 사용)
router.post('/create-vectorstore', express.json(), (req, res) => {
  console.log('📬 벡터스토어 생성 API 호출됨');
  
  const pythonScript = path.join(__dirname, '..', 'python', 'vector_store', 'vector_store_create.py');
  
  // conda 환경(file_search)에서 Python 스크립트 실행
  const command = `conda run -n file_search python "${pythonScript}"`;
  
  console.log('🚀 벡터스토어 생성 스크립트 실행:', command);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('벡터스토어 생성 오류:', error);
      return res.status(500).json({ 
        success: false,
        message: '벡터스토어 생성 중 오류가 발생했습니다.',
        error: error.message,
        stderr: stderr
      });
    }
    
    console.log('벡터스토어 생성 출력:', stdout);
    if (stderr) {
      console.error('벡터스토어 생성 에러:', stderr);
    }
    
    res.json({
      success: true,
      message: '벡터스토어가 성공적으로 생성되었습니다.',
      output: stdout
    });
  });
});

// 벡터스토어 목록 가져오기 API
router.get('/vectorstore-list', async (req, res) => {
  try {
    // MySQL에서 벡터스토어 목록 가져오기
    const sql = 'SELECT folder, count, created_at FROM vectorStore ORDER BY created_at DESC';
    const results = await query(sql);
    
    // 날짜 포맷 변환
    const folderList = results.map(row => ({
      name: row.folder,
      date: new Date(row.created_at).toLocaleString('ko-KR'),
      fileCount: row.count
    }));
    
    res.json({ success: true, folders: folderList });
  } catch (error) {
    console.error('벡터스토어 목록 가져오기 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '벡터스토어 목록을 가져오는데 실패했습니다.' 
    });
  }
});

// AI 검색 API (conda 환경 사용)
router.post('/ai-search', express.json(), (req, res) => {
  console.log('📬 AI 검색 API 호출됨');
  console.log('Request body:', req.body);
  
  const { query } = req.body;
  
  if (!query) {
    console.log('❌ 검색 쿼리 없음');
    return res.status(400).json({ 
      success: false,
      message: '검색 쿼리가 제공되지 않았습니다.' 
    });
  }
  
  const pythonScript = path.join(__dirname, '..', 'python', 'rag', '3d_file_search.py');
  
  // conda 환경(file_search)에서 Python 스크립트 실행
  // 쿼리를 따옴표로 감싸서 전달
  const command = `conda run -n file_search python "${pythonScript}" "${query}"`;
  
  console.log('🚀 AI 검색 스크립트 실행:', command);
  console.log('🔍 검색 쿼리:', query);
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('AI 검색 실행 오류:', error);
      return res.status(500).json({ 
        success: false,
        message: 'AI 검색 중 오류가 발생했습니다.',
        error: error.message,
        stderr: stderr
      });
    }
    
    console.log('AI 검색 출력:', stdout);
    if (stderr) {
      console.error('AI 검색 에러:', stderr);
    }
    
    // 생성된 HTML 파일 경로 추출
    const htmlPathMatch = stdout.match(/\[HTML_FILE_PATH\]([^\[]+)\[\/HTML_FILE_PATH\]/);
    const htmlFilePath = htmlPathMatch ? htmlPathMatch[1] : null;
    
    // 생성된 Bar Chart 파일 경로 추출
    const barChartPathMatch = stdout.match(/\[BAR_CHART_PATH\]([^\[]+)\[\/BAR_CHART_PATH\]/);
    const barChartPath = barChartPathMatch ? barChartPathMatch[1] : null;
    
    // RAG 검색 결과 추출 (===== 사이의 내용)
    const resultMatch = stdout.match(/={50}\n📊 RAG 처리 완료! 최종 결과:\n={50}\n([\s\S]*?)\n={50}/);
    const resultText = resultMatch ? resultMatch[1].trim() : stdout;
    
    res.json({
      success: true,
      message: 'AI 검색이 완료되었습니다.',
      output: resultText,
      htmlFilePath: htmlFilePath,
      barChartPath: barChartPath
    });
  });
});

// 검색 기록 목록 조회 API
router.get('/search-history', async (req, res) => {
  try {
    // MySQL에서 검색 기록 목록 가져오기 (최신순)
    const sql = 'SELECT id, query, search_result, ai_answer, html_file_path, bar_chart_path, created_at FROM search_history ORDER BY created_at DESC LIMIT 50';
    const results = await query(sql);
    
    // 날짜 포맷 변환
    const historyList = results.map(row => ({
      id: row.id,
      query: row.query,
      searchResult: row.search_result,
      aiAnswer: row.ai_answer,
      htmlFilePath: row.html_file_path,
      barChartPath: row.bar_chart_path,
      createdAt: new Date(row.created_at).toLocaleString('ko-KR')
    }));
    
    res.json({ success: true, history: historyList });
  } catch (error) {
    console.error('검색 기록 목록 가져오기 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '검색 기록을 가져오는데 실패했습니다.' 
    });
  }
});

module.exports = router;

