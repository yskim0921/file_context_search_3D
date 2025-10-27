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
    │   └── vector_store_create.py # 벡터스토어 생성
    ├── rag/               # RAG 시스템
    └── util/              # 유틸리티 함수
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
- **폴더 업로드**: 여러 파일을 한 번에 업로드
- **파일 목록 조회**: 업로드된 파일들의 목록 및 정보 확인
- **파일 크기 제한**: 10MB 이하 파일만 업로드 가능

### 2. AI 문서 분석
- **자동 문서 분석**: 업로드된 문서의 내용을 AI가 분석
- **제목 추출**: 문서의 핵심 제목 자동 추출
- **요약 생성**: 문서 내용을 1000자 이내로 요약
- **키워드 추출**: 문서의 핵심 키워드 50개 자동 추출

### 3. 벡터스토어 관리
- **벡터스토어 생성**: 분석된 문서들로 벡터 인덱스 생성
- **벡터스토어 목록**: 생성된 벡터스토어들의 목록 관리
- **시간별 저장**: 생성 시점별로 벡터스토어 분리 저장

### 4. 파일 검색
- **의미 기반 검색**: 벡터 유사도를 통한 의미 기반 문서 검색
- **RAG 시스템**: 검색된 문서를 기반으로 한 질의응답

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
pip install langchain langchain-community pymysql python-docx

conda activate file_search
pip install langchain langchain-community chromadb ollama
```

### 3. 데이터베이스 설정
1. MySQL 서버 실행
2. 데이터베이스 생성:
```sql
CREATE DATABASE final;
```

3. 필요한 테이블 생성 (스키마는 코드에서 자동 생성됨)

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

### 업로드 라우트
- `POST /file_upload` - 단일 파일 업로드
- `POST /folder_upload` - 폴더 업로드

## 🗄️ 데이터베이스 스키마

### documents 테이블
- `id` - 문서 ID (Primary Key)
- `title` - 문서 제목
- `summary` - 문서 요약
- `keywords` - 문서 키워드
- `file_path` - 파일 경로
- `file_type` - 파일 타입
- `created_at` - 생성 시간

### vectorStore 테이블
- `id` - 벡터스토어 ID (Primary Key)
- `folder` - 벡터스토어 폴더명
- `count` - 포함된 문서 수
- `created_at` - 생성 시간

## 🎯 사용 방법

1. **파일 업로드**: 메인 페이지에서 "File Manager"로 이동하여 파일을 업로드합니다.
2. **AI 분석**: 업로드된 파일들이 자동으로 AI에 의해 분석됩니다.
3. **벡터스토어 생성**: 분석된 문서들로 벡터스토어를 생성합니다.
4. **문서 검색**: 생성된 벡터스토어를 통해 의미 기반 문서 검색이 가능합니다.

## 🔍 주요 특징

- **한글 지원**: 한글 파일명 및 내용 완벽 지원
- **파일 타입 제한**: 보안을 위한 특정 파일 타입만 허용
- **에러 처리**: 포괄적인 에러 처리 및 사용자 친화적 메시지
- **모듈화**: 기능별로 분리된 모듈 구조
- **확장성**: 새로운 AI 모델 및 기능 추가 용이

## 📝 라이선스

ISC License

## 👥 기여자

프로젝트 개발자

---

**주의사항**: 이 프로젝트는 개발/테스트 목적으로 제작되었습니다. 프로덕션 환경에서 사용하기 전에 보안 설정을 강화하고 환경 변수를 적절히 설정해주세요.