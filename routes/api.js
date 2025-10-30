const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const http = require('http');
const { exec } = require('child_process');
const { query } = require('../db');

// ollama 서버 체크 함수
async function checkOllamaServer() {
  return new Promise((resolve) => {
    console.log('🔍 Ollama 서버 상태 확인 중...');
    
    // ollama 서버가 실제로 작동하는지 HTTP 요청으로 확인
    const options = {
      hostname: 'localhost',
      port: 11434,
      path: '/api/tags',
      method: 'GET',
      timeout: 2000
    };
    
    const req = http.request(options, (res) => {
      // 응답이 있으면 ollama 서버가 실행 중
      if (res.statusCode === 200) {
        console.log('✅ Ollama 서버가 정상적으로 실행 중입니다.');
        resolve(true);
      } else {
        console.log('❌ Ollama 서버 응답 상태:', res.statusCode);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      // 오류 발생 시 ollama 서버가 꺼져있음
      console.log('❌ Ollama 서버 연결 실패:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      // 타임아웃 발생 시 ollama 서버가 꺼져있음
      console.log('❌ Ollama 서버 응답 시간 초과');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

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

// 파일 삭제 API
router.delete('/delete-file/:filename', async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  
  try {
    const uploadDir = path.join(__dirname, '..', 'public', 'upload', 'files');
    const filePath = path.join(uploadDir, filename);
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        message: '파일을 찾을 수 없습니다.' 
      });
    }
    
    // DB에서 documents 테이블에서도 삭제
    try {
      const sql = 'DELETE FROM documents WHERE file_name = ?';
      await query(sql, [filename]);
      console.log(`✅ DB에서 파일 삭제 완료: ${filename}`);
    } catch (dbError) {
      console.error('DB 삭제 오류 (파일 삭제는 계속 진행):', dbError);
      // DB 오류가 있어도 파일 삭제는 계속 진행
    }
    
    // 파일 삭제
    fs.unlinkSync(filePath);
    console.log(`✅ 파일 삭제 완료: ${filename}`);
    
    res.json({ 
      success: true,
      message: `파일 ${filename}이 삭제되었습니다.` 
    });
  } catch (error) {
    console.error('파일 삭제 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '파일 삭제에 실패했습니다.',
      error: error.message 
    });
  }
});

// 파일 다운로드 API
router.get('/download/:filename', (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  
  try {
    const uploadDir = path.join(__dirname, '..', 'public', 'upload', 'files');
    const filePath = path.join(uploadDir, filename);
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false,
        message: '파일을 찾을 수 없습니다.' 
      });
    }
    
    // 파일 다운로드
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('파일 다운로드 오류:', err);
        if (!res.headersSent) {
          res.status(500).json({ 
            success: false,
            message: '파일 다운로드에 실패했습니다.' 
          });
        }
      }
    });
  } catch (error) {
    console.error('파일 다운로드 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '파일 다운로드에 실패했습니다.',
      error: error.message 
    });
  }
});

// Python 스크립트 실행 API (conda 환경 사용)
router.post('/run-python', express.json(), async (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ 
      success: false,
      message: '파일 경로가 제공되지 않았습니다.' 
    });
  }
  
  // ollama 서버 체크
  const isOllamaRunning = await checkOllamaServer();
  if (!isOllamaRunning) {
    console.log('❌ Ollama 서버가 실행 중이 아닙니다.');
    return res.status(500).json({ 
      success: false,
      message: 'Ollama 서버가 꺼져 있습니다. Ollama 서버를 실행한 후 다시 시도해주세요.',
      ollamaError: true
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
router.post('/run-folder-python', express.json(), async (req, res) => {
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
  
  // ollama 서버 체크
  const isOllamaRunning = await checkOllamaServer();
  if (!isOllamaRunning) {
    console.log('❌ Ollama 서버가 실행 중이 아닙니다.');
    return res.status(500).json({ 
      success: false,
      message: 'Ollama 서버가 꺼져 있습니다. Ollama 서버를 실행한 후 다시 시도해주세요.',
      ollamaError: true
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
    // MySQL에서 벡터스토어 목록 가져오기 (id 포함)
    const sql = 'SELECT id, folder, count, created_at FROM vectorStore ORDER BY created_at DESC';
    const results = await query(sql);
    
    // 날짜 포맷 변환
    const folderList = results.map(row => ({
      id: row.id,
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

// 벡터스토어 검색 API
router.post('/search-vectorstore', express.json(), async (req, res) => {
  console.log('📬 벡터스토어 검색 API 호출됨');
  console.log('Request body:', req.body);
  
  const { query, vectorstoreId } = req.body;
  
  if (!query) {
    console.log('❌ 검색 쿼리 없음');
    return res.status(400).json({ 
      success: false,
      message: '검색 쿼리가 제공되지 않았습니다.' 
    });
  }
  
  // ollama 서버 체크
  console.log('🔍 Ollama 서버 상태 확인 중...');
  const isOllamaRunning = await checkOllamaServer();
  
  if (!isOllamaRunning) {
    console.log('❌ 벡터스토어 검색 실패: Ollama 서버가 꺼져 있습니다.');
    return res.status(500).json({ 
      success: false,
      message: 'Ollama 서버가 꺼져 있습니다. Ollama 서버를 실행한 후 다시 시도해주세요.',
      ollamaError: true,
      details: '벡터스토어 검색 기능을 사용하려면 Ollama 서버가 실행 중이어야 합니다.'
    });
  }
  
  try {
    // documents 폴더에서 최신 폴더 직접 찾기
    const documentsPath = path.join(__dirname, '..', 'python', 'vector_store', 'rag_chroma', 'documents');
    
    let vectorstorePath;
    let folderName;
    
    if (fs.existsSync(documentsPath)) {
      const items = fs.readdirSync(documentsPath);
      // 폴더만 필터링 (파일 제외, 숨김 파일 제외)
      const folders = items.filter(item => {
        const itemPath = path.join(documentsPath, item);
        return fs.statSync(itemPath).isDirectory() && !item.startsWith('.');
      });
      
      if (folders.length > 0) {
        // 폴더명으로 정렬하여 최신 폴더 찾기
        folders.sort().reverse();
        folderName = folders[0];
        vectorstorePath = path.join(documentsPath, folderName);
        console.log(`✅ documents 폴더에서 최신 벡터스토어 사용: ${folderName}`);
      } else {
        return res.status(404).json({ 
          success: false,
          message: '벡터스토어 폴더를 찾을 수 없습니다.' 
        });
      }
    } else {
      return res.status(404).json({ 
        success: false,
        message: 'documents 폴더가 존재하지 않습니다.' 
      });
    }
    
    // Python 스크립트 실행
    const pythonScript = path.join(__dirname, '..', 'python', 'vector_store', 'vector_store_search.py');
    
    // conda 환경(file_search)에서 Python 스크립트 실행
    const command = `conda run -n file_search python "${pythonScript}" "${query}" "${vectorstorePath}"`;
    
    console.log('🚀 벡터스토어 검색 스크립트 실행:', command);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('벡터스토어 검색 오류:', error);
        return res.status(500).json({ 
          success: false,
          message: '벡터스토어 검색 중 오류가 발생했습니다.',
          error: error.message,
          stderr: stderr
        });
      }
      
      console.log('벡터스토어 검색 출력:', stdout);
      
      // 결과 파싱 (JSON 형식으로 출력되어야 함)
      try {
        const results = JSON.parse(stdout);
        res.json({
          success: true,
          message: '벡터스토어 검색이 완료되었습니다.',
          results: results
        });
      } catch (parseError) {
        res.json({
          success: true,
          message: '벡터스토어 검색이 완료되었습니다.',
          rawOutput: stdout
        });
      }
    });
  } catch (error) {
    console.error('벡터스토어 검색 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '벡터스토어 검색 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 벡터스토어 삭제 API
router.delete('/delete-vectorstore/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    // 먼저 해당 벡터스토어의 folder 정보 가져오기
    const selectSql = 'SELECT folder FROM vectorStore WHERE id = ?';
    const selectResults = await query(selectSql, [id]);
    
    if (selectResults.length === 0) {
      return res.status(404).json({ 
        success: false,
        message: '벡터스토어를 찾을 수 없습니다.' 
      });
    }
    
    const folderName = selectResults[0].folder;
    
    // 실제 ChromaDB 폴더 삭제
    const chromaPath = path.join(__dirname, '..', 'python', 'vector_store', 'rag_chroma', 'documents', folderName);
    
    if (fs.existsSync(chromaPath)) {
      console.log(`🗑️ ChromaDB 폴더 삭제 시도: ${chromaPath}`);
      // 폴더와 모든 하위 파일 삭제
      fs.rmSync(chromaPath, { recursive: true, force: true });
      console.log(`✅ ChromaDB 폴더 삭제 완료: ${chromaPath}`);
    } else {
      console.log(`⚠️ ChromaDB 폴더가 존재하지 않음: ${chromaPath}`);
    }
    
    // DB에서 벡터스토어 삭제
    const deleteSql = 'DELETE FROM vectorStore WHERE id = ?';
    await query(deleteSql, [id]);
    
    console.log(`✅ 벡터스토어 삭제 완료: ID ${id}, Folder: ${folderName}`);
    
    res.json({ 
      success: true,
      message: `벡터스토어 ${folderName}가 삭제되었습니다.` 
    });
  } catch (error) {
    console.error('벡터스토어 삭제 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '벡터스토어 삭제에 실패했습니다.',
      error: error.message 
    });
  }
});

// AI 검색 API (conda 환경 사용)
router.post('/ai-search', express.json(), async (req, res) => {
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
  
  // ollama 서버 체크
  console.log('🔍 Ollama 서버 상태 확인 중...');
  const isOllamaRunning = await checkOllamaServer();
  
  if (!isOllamaRunning) {
    console.log('❌ AI 검색 실패: Ollama 서버가 꺼져 있습니다.');
    console.log('📝 사용자에게 Ollama 서버를 실행하도록 안내합니다.');
    return res.status(500).json({ 
      success: false,
      message: 'Ollama 서버가 꺼져 있습니다. Ollama 서버를 실행한 후 다시 시도해주세요.',
      ollamaError: true,
      details: 'AI 검색 기능을 사용하려면 Ollama 서버가 실행 중이어야 합니다. 터미널에서 명령어를 실행하세요.'
    });
  }
  
  console.log('✅ Ollama 서버 정상 확인, AI 검색을 시작합니다.');
  
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
    
    // Python 실행 완료 후 DB에서 최신 검색 기록 가져오기
    const getLatestSearchHistory = async () => {
      try {
        const sql = 'SELECT search_result, ai_answer, ranking_result, html_file_path, bar_chart_path, chroma_path FROM search_history WHERE query = ? ORDER BY created_at DESC LIMIT 1';
        const results = await query(sql, [query]);
        
        if (results && results.length > 0) {
          return {
            searchResult: results[0].search_result || '',
            aiAnswer: results[0].ai_answer || '',
            rankingResult: results[0].ranking_result || null,
            htmlFilePath: results[0].html_file_path || htmlFilePath,
            barChartPath: results[0].bar_chart_path || barChartPath,
            chromaPath: results[0].chroma_path || ''
          };
        }
        
        return {
          searchResult: stdout,
          aiAnswer: stdout,
          rankingResult: null,
          htmlFilePath: htmlFilePath,
          barChartPath: barChartPath,
          chromaPath: ''
        };
      } catch (error) {
        console.error('검색 기록 가져오기 오류:', error);
        return {
          searchResult: stdout,
          aiAnswer: stdout,
          rankingResult: null,
          htmlFilePath: htmlFilePath,
          barChartPath: barChartPath,
          chromaPath: ''
        };
      }
    };
    
    getLatestSearchHistory().then(dbData => {
      res.json({
        success: true,
        message: 'AI 검색이 완료되었습니다.',
        searchResult: dbData.searchResult,
        aiAnswer: dbData.aiAnswer,
        rankingResult: dbData.rankingResult,
        htmlFilePath: dbData.htmlFilePath,
        barChartPath: dbData.barChartPath,
        chromaPath: dbData.chromaPath
      });
    });
  });
});

// 검색 기록 목록 조회 API
router.get('/search-history', async (req, res) => {
  try {
    // MySQL에서 검색 기록 목록 가져오기 (최신순)
    const sql = 'SELECT id, query, search_result, ai_answer, ranking_result, html_file_path, bar_chart_path, chroma_path, created_at FROM search_history ORDER BY created_at DESC LIMIT 50';
    const results = await query(sql);
    
    // 날짜 포맷 변환
    const historyList = results.map(row => {
      let rankingResult = null;
      try {
        // JSON 문자열을 파싱
        if (row.ranking_result) {
          console.log('=== API DEBUG ===');
          console.log('Row ID:', row.id);
          console.log('ranking_result (raw):', row.ranking_result);
          console.log('ranking_result type:', typeof row.ranking_result);
          
          // 이미 객체인 경우와 문자열인 경우 처리
          if (typeof row.ranking_result === 'string') {
            rankingResult = JSON.parse(row.ranking_result);
          } else {
            // 이미 파싱된 객체인 경우
            rankingResult = row.ranking_result;
          }
          
          console.log('ranking_result (parsed):', rankingResult);
          console.log('is array?', Array.isArray(rankingResult));
          console.log('length:', rankingResult ? rankingResult.length : 'null');
        }
      } catch (e) {
        console.error('순위 리스트 파싱 오류:', e);
        console.error('Raw data:', row.ranking_result);
        rankingResult = null;
      }
      
      return {
        id: row.id,
        query: row.query,
        searchResult: row.search_result,
        aiAnswer: row.ai_answer,
        rankingResult: rankingResult,
        htmlFilePath: row.html_file_path,
        barChartPath: row.bar_chart_path,
        chromaPath: row.chroma_path,
        createdAt: new Date(row.created_at).toLocaleString('ko-KR')
      };
    });
    
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

