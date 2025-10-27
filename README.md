# 파일 찾기 AI 서비스

회의록 및 문서 관리를 위한 AI 기반 파일 검색 및 관리 웹 애플리케이션입니다.

## 📋 프로젝트 개요

이 프로젝트는 업로드된 문서들을 AI를 활용하여 분석하고, 벡터 검색을 통해 관련 문서를 찾을 수 있는 웹 서비스입니다. LangChain과 Ollama를 활용한 RAG(Retrieval-Augmented Generation) 시스템을 구현했습니다.

## 🏗️ 프로젝트 구조

```
website/
├── app.js                 # Express 앱 설정 및 미들웨어
├── server.js              # 서버 시작점
├── db.js                  # MySQL 데이터베이스 연결 설정
├── package.json           # Node.js 의존성 관리
├── env.example            # 환경 변수 예시
├── routes/                # 라우트 모듈
│   ├── pages.js           # 페이지 라우트 (GET)
│   ├── api.js             # API 라우트 (REST API)
│   └── uploads.js         # 파일 업로드 라우트
├── views/                 # EJS 템플릿
│   ├── index.ejs          # 메인 페이지
│   ├── file_manager.ejs   # 파일 관리 페이지
│   ├── file_upload.ejs    # 파일 업로드 페이지
│   ├── folder_upload.ejs  # 폴더 업로드 페이지
│   ├── vectorstore.ejs    # 벡터스토어 관리 페이지
│   ├── file_search.ejs    # 파일 검색 페이지
│   └── error/             # 에러 페이지
├── public/                # 정적 파일
│   ├── css/               # 스타일시트
│   └── upload/            # 업로드된 파일 저장소
└── python/                # Python AI 처리 스크립트
    ├── upload/             # 파일 업로드 처리
    │   ├── file_upload.py  # 단일 파일 처리
    │   └── folder_upload.py # 폴더 업로드 처리
    ├── vector_store/       # 벡터스토어 관리
    │   ├── vector_store_create.py # 벡터스토어 생성
    │   ├── rag_chroma/     # 벡터스토어 데이터
    │   │   └── documents/  # 문서별 벡터 인덱스
    │   ├── DB_Table_documents.sql
    │   └── DB_Table_vecTorStore.sql
    └── rag/                # RAG 시스템
        ├── 3d_file_search.py # AI 검색 + 3D 시각화
        ├── search/         # 생성된 검색 결과 HTML
        └── DB_Table_search_history.sql
```

## 🛠️ 기술 스택

### Backend
- **Node.js** - 서버 런타임
- **Express.js** - 웹 프레임워크
- **EJS** - 템플릿 엔진
- **MySQL** - 데이터베이스
- **Multer** - 파일 업로드 처리

### AI/ML
- **Python** - AI 처리 언어
- **LangChain** - LLM 프레임워크
- **Ollama** - 로컬 LLM 실행
- **Chroma** - 벡터 데이터베이스
- **PyMySQL** - Python MySQL 연결

### Frontend
- **HTML5/CSS3** - 마크업 및 스타일링
- **JavaScript** - 클라이언트 사이드 로직
- **EJS** - 서버 사이드 렌더링

### 개발 도구
- **Nodemon** - 개발 서버 자동 재시작
- **Conda** - Python 환경 관리

## 🚀 주요 기능

### 1. 파일 관리
- **단일 파일 업로드**: PDF, TXT, DOCX 파일 지원
- **폴더 업로드**: 여러 파일을 한 번에 업로드하며 **진행 바로 실시간 진행률 표시**
- **파일 목록 조회**: 업로드된 파일들의 목록 및 정보 확인 (페이징 지원)
- **파일명 기반 검색**: 파일 이름으로 빠르게 검색
- **파일 크기 제한**: 10MB 이하 파일만 업로드 가능

### 2. AI 문서 분석
- **자동 문서 분석**: 업로드된 문서의 내용을 AI가 분석
- **제목 추출**: 문서의 핵심 제목 자동 추출
- **요약 생성**: 문서 내용을 1000자 이내로 요약
- **키워드 추출**: 문서의 핵심 키워드 50개 자동 추출
- **폴더 업로드 진행률**: 막대 그래프로 진행 상황 실시간 표시

### 3. 벡터스토어 관리
- **벡터스토어 생성**: 분석된 문서들로 벡터 인덱스 생성
- **벡터스토어 목록**: 생성된 벡터스토어들의 목록 관리
- **시간별 저장**: 생성 시점별로 벡터스토어 분리 저장
- **최신 자동 선택**: 검색 시 가장 최신 벡터스토어 자동 사용

### 4. AI 문서 검색
- **의미 기반 검색**: 벡터 유사도를 통한 의미 기반 문서 검색
- **RAG 시스템**: 검색된 문서를 기반으로 한 질의응답
- **3D 시각화**: 검색 결과를 3D 공간에 배치하여 유사도 표현
- **관련성 차트**: 막대 그래프로 검색 결과의 관련성 표시
- **AI 답변 강조**: 검색 결과에서 AI 답변을 별도로 강조 표시
- **검색 기록 저장**: 검색 내용, AI 답변, 시각화 파일을 DB에 저장
- **검색 기록 조회**: 과거 검색 내역을 리스트로 조회 및 재확인

## 📦 설치 및 실행

### 1. 환경 요구사항
- Node.js (v14 이상)
- Python 3.8 이상
- MySQL 8.0 이상
- Conda (Python 환경 관리용)

### 2. 의존성 설치

#### Node.js 의존성
```bash
npm install
```

#### Python 의존성
```bash
# Conda 환경 생성
conda create -n file_upload python=3.8
conda create -n file_search python=3.8

# 환경 활성화 후 패키지 설치
conda activate file_upload
pip install langchain langchain-community pymysql python-docx pypdf docx2txt

conda activate file_search
pip install langchain langchain-community chromadb langgraph ollama plotly numpy
```

### 3. 데이터베이스 설정
1. MySQL 서버 실행
2. 데이터베이스 생성:
```sql
CREATE DATABASE final;
```

3. 테이블 생성:
```bash
# MySQL에 접속하여 테이블 생성
mysql -u admin -p final

# SQL 파일 실행
source python/vector_store/DB_Table_documents.sql
source python/vector_store/DB_Table_vecTorStore.sql
source python/rag/DB_Table_search_history.sql
```

또는 MySQL Workbench 등을 통해 SQL 파일을 직접 실행

### 4. 환경 변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정
```

### 5. 서버 실행
```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm start
```

서버는 기본적으로 `http://localhost:5555`에서 실행됩니다.

## 🔧 API 엔드포인트

### 페이지 라우트
- `GET /` - 메인 페이지
- `GET /file_manager` - 파일 관리 페이지
- `GET /file_upload` - 파일 업로드 페이지
- `GET /folder_upload` - 폴더 업로드 페이지
- `GET /vectorstore` - 벡터스토어 관리 페이지
- `GET /file_search` - 파일 검색 페이지

### API 라우트
- `GET /api/files` - 업로드된 파일 목록 조회
- `POST /api/run-python` - 단일 파일 AI 처리
- `POST /api/run-folder-python` - 폴더 AI 처리
- `POST /api/create-vectorstore` - 벡터스토어 생성
- `GET /api/vectorstore-list` - 벡터스토어 목록 조회
- `POST /api/ai-search` - AI 검색 실행 (RAG + 3D 시각화)
- `GET /api/search-history` - AI 검색 기록 목록 조회

### 업로드 라우트
- `POST /file_upload` - 단일 파일 업로드
- `POST /folder_upload` - 폴더 업로드

### 정적 파일 라우트
- `GET /search-results/*` - AI 검색 결과 HTML 파일 제공

## 🗄️ 데이터베이스 스키마

### documents 테이블
- `id` - 문서 ID (Primary Key)
- `title` - 문서 제목
- `summary` - 문서 요약
- `keywords` - 문서 키워드
- `file_location` - 파일 위치
- `file_name` - 파일명
- `doc_type` - 파일 타입 (.pdf, .txt, .docx 등)
- `created_at` - 생성 시간

### vectorStore 테이블
- `id` - 벡터스토어 ID (Primary Key)
- `folder` - 벡터스토어 폴더명
- `count` - 포함된 문서 수
- `created_at` - 생성 시간

### search_history 테이블 (AI 검색 기록)
- `id` - 검색 ID (Primary Key)
- `query` - 검색 내용
- `search_result` - 전체 검색 결과 텍스트
- `ai_answer` - AI 답변 (AI가 추출한 답변만 별도 저장)
- `ranking_result` - 검색 결과 순위 리스트 (JSON 형식)
  - `rank`: 순위
  - `file_name`: 파일명
  - `relevance`: 관련성 (%)
  - `summary`: 요약
- `html_file_path` - 3D 시각화 HTML 파일 경로
- `bar_chart_path` - Bar Chart HTML 파일 경로
- `created_at` - 검색 날짜

## 🎯 사용 방법

### 기본 워크플로우

1. **파일 업로드**
   - 메인 페이지에서 "File Manager"로 이동
   - "파일 업로드" 또는 "폴더 업로드" 선택
   - 파일 선택 후 업로드 (진행 바로 진행률 확인)

2. **AI 분석**
   - 업로드된 파일들이 자동으로 AI에 의해 분석됨
   - 제목, 요약, 키워드가 자동으로 추출되어 DB에 저장

3. **벡터스토어 생성**
   - "벡터스토어 만들기" 페이지로 이동
   - "벡터 스토어 생성" 버튼 클릭
   - 진행 바로 생성 진행률 확인

4. **AI 문서 검색**
   - "문서내용 검색파일" 페이지로 이동
   - 검색어 입력 (예: "프로젝트 관리 방법에 대한 문서")
   - "AI 검색 실행" 버튼 클릭
   - 검색 결과 확인:
     - AI 답변 (가장 위에 강조 표시)
     - 관련성 차트 (막대 그래프)
     - 3D 공간 시각화

5. **검색 기록 확인**
   - "AI 검색 기록" 섹션에서 과거 검색 내역 조회
   - 기록 클릭 시 상세 내용 재확인

### 검색 기록 기능
- 모든 검색이 자동으로 DB에 저장됨
- AI 답변은 별도로 추출하여 강조 표시
- 시각화 파일은 날짜시간이 붙은 고유 파일명으로 저장
- 과거 검색 결과를 언제든지 다시 확인 가능

## 🆕 최근 추가된 기능

### AI 검색 시스템 (3D 시각화 포함)
- **자연어 검색**: 문장으로 검색하여 관련 문서 자동 발견
- **RAG 기반 답변**: 검색된 문서를 바탕으로 AI가 직접 답변 생성
- **3D 공간 시각화**: 검색 결과를 3D 공간에 배치
  - 중앙: 사용자 질문 (빨간색 다이아몬드)
  - 주변: 검색된 문서들 (가까울수록 관련성 높음)
  - 연결선: 쿼리와 문서 간 관계 표시
- **관련성 차트**: 막대 그래프로 문서별 관련성 순위 표시
- **자동 파일명**: `검색어_YYYYMMDD_HHMMSS.html` 형식으로 고유 파일 생성

### 검색 기록 관리
- **자동 저장**: 모든 검색이 MySQL에 자동 저장
- **재확인 기능**: 과거 검색 내역을 클릭하여 다시 확인
- **AI 답변 분리**: AI가 생성한 답변만 별도 컬럼에 저장하여 빠른 접근
- **순위 리스트 저장**: 검색 결과 순위를 JSON 형식으로 저장 (파일명, 관련성, 요약)
- **순위 표시**: 과거 검색 기록에서 순위별로 결과를 메달로 표시
- **시각화 재생**: 저장된 3D 시각화와 차트를 바로 확인

### 진행률 표시
- **폴더 업로드**: 파일 업로드 진행률을 막대 그래프로 실시간 표시
- **파일 처리**: Python 분석 진행률 표시
- **단계별 진행**: 업로드 → 분석 → 완료 단계 명확히 구분

## 🔍 주요 특징

- **한글 지원**: 한글 파일명 및 내용 완벽 지원
- **진행률 표시**: 폴더 업로드 시 실시간 진행률을 막대 그래프로 표시
- **RAG 시스템**: LangChain + Ollama를 활용한 검색 증강 생성
- **3D 시각화**: 검색 결과를 3D 공간에 배치하여 유사도를 시각적으로 표현
  - 유사도가 높을수록 중앙(쿼리)에 가까이 배치
  - 관련성 순위를 한눈에 파악 가능
- **AI 답변 강조**: 검색 결과에서 AI 답변만 별도로 추출하여 강조 표시
- **검색 기록 관리**: 모든 검색이 DB에 자동 저장되며 재확인 가능
- **자동 파일명**: 날짜시간이 포함된 고유 파일명으로 중복 방지
- **자동 벡터스토어 선택**: 최신 벡터스토어를 자동으로 선택하여 사용
- **에러 처리**: 포괄적인 에러 처리 및 사용자 친화적 메시지
- **모듈화**: 기능별로 분리된 모듈 구조
- **확장성**: 새로운 AI 모델 및 기능 추가 용이
- **페이징**: 파일 목록 페이징으로 대량 데이터 관리
- **파일명 검색**: 기본 파일명 검색 기능 제공

## 📝 라이선스

ISC License

## 👥 프로젝트 개발자

김윤성성

---

**주의사항**: 이 프로젝트는 개발/테스트 목적으로 제작되었습니다. 프로덕션 환경에서 사용하기 전에 보안 설정을 강화하고 환경 변수를 적절히 설정해주세요.