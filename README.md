# 파일 찾기 AI 서비스

-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

제공해주신 파이썬 스크립트는 **RAG (Retrieval-Augmented Generation, 검색 증강 생성)** 아키텍처를 기반으로 파일을 검색하고 답변을 생성합니다. 특히, 이 시스템은 파일의 내용뿐만 아니라 메타데이터를 통합하고, 검색 과정을 시각화하는 독특한 특징을 가지고 있습니다.

파일을 찾는 과정은 크게 **준비 (인프라)**, **검색 (RAG 파이프라인)**, **시각화 및 기록**의 세 단계로 나뉩니다.

---

## I. 핵심 인프라: 파일 데이터의 저장 구조

이 시스템에서 파일 정보는 두 가지 영역에 분산되어 저장됩니다.

### 1. 벡터 데이터베이스 (ChromaDB)
*   **저장 내용:** 실제 문서 파일들의 **내용(텍스트)**을 **임베딩(Embedding)**이라는 고차원 벡터 형태로 변환하여 저장합니다.
*   **역할:** 검색 에이전트가 사용자의 질문(쿼리)과 의미적으로 유사한 문서 조각(Chunk)을 찾는 데 사용됩니다. `OllamaEmbeddings`를 사용하여 텍스트의 의미를 숫자로 압축합니다.
*   **경로:** `CHROMA_PATH` (가장 최근에 생성된 `documents/YYYYMMDD_HHMMSS` 폴더)에 저장되어 있습니다.

### 2. 관계형 데이터베이스 (MySQL - `search_history`, `documents` 테이블)
*   **저장 내용:** 파일의 메타데이터(파일명, 위치, 요약, 키워드, 유형)와 검색 이력(쿼리, AI 답변, HTML 파일 경로)을 저장합니다.
*   **역할:** 벡터 검색 결과로 얻은 `doc_id`를 사용하여 실제 **파일명, 위치, 요약** 등의 사람이 읽을 수 있는 정보를 조회(Lookup)하는 데 사용됩니다.

### 🔍 파일 검색의 기본 원리

이 시스템은 파일명을 직접 검색하는 것이 아니라, 사용자의 **질문과 의미적으로 가장 유사한 문맥(Context)**을 담고 있는 벡터를 찾습니다.

1.  질문 -> 벡터 변환
2.  ChromaDB의 모든 문서 벡터와 비교
3.  가장 가까운 벡터 (유사도가 높은 문서 내용)를 추출
4.  추출된 문서 내용의 메타데이터를 MySQL에서 확인하여 **어떤 파일**인지 식별

---

## II. LangGraph를 통한 파일 검색 및 처리 흐름

LangGraph는 검색 과정을 네 단계의 **에이전트(Agent)** 노드로 나누어 순차적으로 실행합니다.

### 단계 1: 키워드 추출 (Extractor Agent)

*   **입력:** 사용자 질문 (`query`)
*   **처리:** LLM (`exaone3.5:2.4b`)은 쿼리를 분석하여 벡터 검색에 최적화된 키워드 문자열(`keywords`)을 생성합니다.
*   **역할:** 질문의 핵심 주제를 압축하여, 다음 단계인 벡터 검색의 효율을 높입니다.

### 단계 2: RAG 검색 및 관련성 계산 (RAG Search Agent)

이 단계가 **파일을 찾는 가장 중요한 핵심**입니다.

1.  **벡터 검색:** `vectorstore.similarity_search_with_score(state["keywords"], k=10)`를 실행하여 키워드 벡터와 유사한 **상위 10개**의 문서 내용(Chunk)과 **유사도 점수(Score, 거리)**를 가져옵니다.
2.  **메타데이터 조회:** 각 검색 결과의 ID (`doc_id`)를 사용하여 MySQL `documents` 테이블에서 해당 문서의 **파일명, 위치, 요약** 등 메타데이터를 조회합니다.
3.  **관련성(Relevance) 계산:** 벡터 거리 점수(Score)를 **0%에서 100% 사이의 관련성(Relevance)**으로 정규화하여 변환합니다. (거리가 가까울수록 100%에 가까워짐).
4.  **컨텍스트 구축:** 관련성이 높은 문서 조각(Chunk content)을 모아 다음 LLM 답변 생성 단계에서 사용할 **컨텍스트(Context)**를 구성합니다.
5.  **시각화 데이터 업데이트:** 계산된 파일별 관련성 정보를 `visualizer` 객체에 전달합니다.

### 단계 3: 답변 생성 (Answer Generator Agent)

*   **입력:** 검색된 문서 내용(`context`), 파일 목록 요약(`search_summary`), 원본 질문(`query`).
*   **처리:** LLM (`ChatOllama`)은 검색된 컨텍스트만을 바탕으로 질문에 답변을 생성하고, **관련성 높은 파일 3개**를 추천 목록 형태로 요약합니다.
*   **출력 형식:** 답변 내용과 함께 가장 관련성이 높은 파일을 추천하는 `==최종결론==` 부분을 포함합니다.

### 단계 4: 결과 형식화 및 저장 (Result Formatter & Final Save)

1.  **형식화:** 최종 AI 답변과 함께, RAG 검색 단계에서 얻은 모든 **검색된 파일 목록(순위, 관련성 포함)**을 보기 좋게 통합하여 최종 결과 문자열을 만듭니다.
2.  **시각화 파일 생성:** `RAGNotebookVisualizer.show_visualization_no_open()` 메서드를 호출하여 3D 시각화 HTML 파일과 막대 그래프 HTML 파일을 생성합니다.
3.  **DB 기록 저장:** `save_search_history` 함수를 호출하여 쿼리, 최종 답변, 검색 결과 순위 리스트(JSON), 생성된 HTML 파일 경로 등을 MySQL `search_history` 테이블에 영구적으로 저장합니다.

---

## III. 3D 시각화를 통한 파일 관련성 표현

이 스크립트의 독특한 부분은 검색 결과를 **3D 공간에 매핑**하여 보여주는 것입니다.

### 1. 3D 공간의 의미

| 요소 | 위치/특징 | 의미하는 바 |
| :--- | :--- | :--- |
| **중앙 (0, 0, 0)** | 붉은색 다이아몬드 노드 | **사용자 질문 (Query)** |
| **주변 노드** | 다양한 크기와 색상의 구체 | **검색된 문서 파일** |
| **Z축 거리** | 중앙 쿼리 노드로부터의 거리 | **벡터 유사도 (거리) / 관련성** |

### 2. 시각적 관련성 표현

*   **거리 (Distance):** 파일 노드가 중앙 쿼리 노드에서 **가까울수록** (Z축 값이 작을수록) **관련성(Relevance)이 높다**는 것을 의미합니다.
    *   (스크립트에서 `dist`는 `relevance`에 반비례하도록 설정되어 있습니다.)
*   **크기 (Size):** 관련성이 높을수록 마커 크기가 커집니다.
*   **색상 (Color):** 관련성이 높을수록 색상 스케일(Viridis) 상 밝은 노란색에 가까워집니다 (100%에 가까움).

따라서 사용자는 검색된 파일들이 질문과 얼마나 밀접하게 연결되어 있는지 직관적으로 파악할 수 있습니다.

### 요약

이 시스템은 단순히 파일을 찾는 것이 아니라, **질문의 의미**를 파악하여 **의미적으로 가장 가까운 파일의 내용**을 검색(RAG)하고, 그 결과를 기반으로 답변을 생성하며, **검색 과정을 시각적으로 분석**할 수 있도록 파일의 관련성을 공간적으로 매핑하여 제공하는 구조입니다.




-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

회의록 및 문서 관리를 위한 AI 기반 파일 검색 및 관리 웹 애플리케이션입니다.

## 📋 프로젝트 개요

이 프로젝트는 업로드된 문서들을 AI를 활용하여 분석하고, 벡터 검색을 통해 관련 문서를 찾을 수 있는 웹 서비스입니다. LangChain과 Ollama를 활용한 RAG(Retrieval-Augmented Generation) 시스템을 구현했습니다.

### 핵심 기능
- 📄 **문서 업로드 및 AI 분석**: PDF, DOCX, TXT, CSV, HTML 파일 지원, 자동 제목/요약/키워드 추출
- 🔍 **의미 기반 검색**: 벡터 유사도를 통한 자연어 문서 검색
- 🤖 **RAG 기반 질의응답**: 검색된 문서를 바탕으로 한 AI 답변 생성
- 📊 **3D 시각화**: 검색 결과를 3D 공간에 배치하여 유사도를 시각적으로 표현
- 📈 **검색 기록 관리**: 모든 검색 내역을 DB에 저장하고 재확인 가능

## 🏗️ 프로젝트 구조

```
website/
├── app.js                          # Express 앱 설정 및 미들웨어
├── server.js                       # 서버 시작점 (포트 5555)
├── db.js                          # MySQL 데이터베이스 연결 설정
├── package.json                    # Node.js 의존성 관리
├── env.example                     # 환경 변수 예시
│
├── routes/                         # 라우트 모듈
│   ├── pages.js                   # 페이지 라우트 (GET)
│   ├── api.js                     # REST API 엔드포인트
│   └── uploads.js                 # 파일 업로드 라우트
│
├── views/                          # EJS 템플릿
│   ├── index.ejs                  # 메인 페이지
│   ├── file_manager.ejs           # 파일 관리 페이지 (페이징 지원)
│   ├── file_upload.ejs            # 단일 파일 업로드 페이지
│   ├── folder_upload.ejs          # 폴더 업로드 페이지 (진행률 표시)
│   ├── vectorstore.ejs            # 벡터스토어 관리 페이지
│   ├── file_search.ejs            # AI 문서 검색 페이지
│   └── error/                     # 에러 페이지 (404, 500)
│
├── public/                         # 정적 파일
│   ├── css/                       # 스타일시트
│   └── upload/                    # 업로드된 파일 저장소
│       └── files/                 # 실제 파일 저장 위치
│
└── python/                         # Python AI 처리 스크립트
    ├── upload/                     # 파일 업로드 및 분석
    │   ├── file_upload.py          # 단일 파일 AI 분석 처리
    │   └── folder_upload.py        # 폴더 일괄 처리
    │
    ├── vector_store/               # 벡터스토어 관리
    │   ├── vector_store_create.py # 벡터스토어 생성 (ChromaDB)
    │   ├── vector_store_search.py  # 벡터스토어 검색 (레거시)
    │   ├── rag_chroma/            # ChromaDB 벡터 저장소
    │   │   └── documents/        # 문서별 벡터 인덱스 (날짜별 폴더)
    │   │       └── YYYYMMDD_HHMMSS/  # 생성 시점별 폴더
    │   ├── DB_Table_documents.sql     # documents 테이블 스키마
    │   └── DB_Table_vecTorStore.sql  # vectorStore 테이블 스키마
    │
    └── rag/                        # RAG 시스템 (검색 및 답변 생성)
        ├── 3d_file_search.py       # AI 검색 + 3D 시각화 (메인 RAG 시스템)
        ├── search/                # 생성된 검색 결과 HTML
        │   ├── {query}_3d_visualization_{timestamp}.html
        │   └── {query}_bar_chart_{timestamp}.html
        └── DB_Table_search_history.sql  # search_history 테이블 스키마
```

## 🛠️ 기술 스택

### Backend
- **Node.js** (v14+) - 서버 런타임
- **Express.js** (v4.19+) - 웹 프레임워크
- **EJS** (v3.1+) - 템플릿 엔진
- **MySQL** (v8.0+) - 관계형 데이터베이스
- **Multer** (v1.4+) - 파일 업로드 처리 미들웨어
- **MySQL2** (v3.15+) - MySQL 비동기 연결 풀

### AI/ML
- **Python** (v3.8+) - AI 처리 언어
- **LangChain** (v0.2+) - LLM 프레임워크 및 체인 구성
- **LangGraph** - 에이전트 워크플로우 관리
- **Ollama** - 로컬 LLM 실행 엔진
  - **모델**: `exaone3.5:2.4b` (임베딩 및 생성 모델)
- **ChromaDB** - 벡터 데이터베이스 (문서 임베딩 저장)
- **PyMySQL** - Python MySQL 연결 라이브러리
- **Plotly** - 3D 시각화 및 차트 생성

### Frontend
- **HTML5/CSS3** - 마크업 및 스타일링
- **JavaScript (ES6+)** - 클라이언트 사이드 로직
- **EJS** - 서버 사이드 렌더링 템플릿

### 개발 도구
- **Nodemon** - 개발 서버 자동 재시작
- **Conda** - Python 환경 관리 (2개 환경 분리)
  - `file_upload`: 파일 분석용 환경
  - `file_search`: RAG 검색용 환경

## 🚀 주요 기능

### 1. 파일 관리

#### 단일 파일 업로드
- **지원 형식**: PDF, TXT, DOCX
- **최대 크기**: 10MB
- **자동 분석**: 업로드 즉시 AI 분석 시작
- **한글 파일명 지원**: 완벽한 한글 인코딩 처리

#### 폴더 업로드
- **일괄 업로드**: 여러 파일을 한 번에 업로드
- **진행률 표시**: 실시간 진행률을 막대 그래프로 표시
  - 업로드 진행률 (%)
  - 파일별 처리 상태 표시
- **허용 형식**: PDF, DOCX, CSV, TXT, HTML
- **자동 필터링**: 지원하지 않는 파일 형식 자동 제외
- **배치 처리**: 파일별 순차 처리 및 결과 표시

#### 파일 목록 관리
- **페이징 지원**: 대량 파일 효율적 관리
- **파일명 검색**: 빠른 파일 찾기
- **최신순 정렬**: 업로드 날짜 기준 정렬
- **파일 삭제**: 파일 및 DB 기록 동시 삭제
- **상세 정보**: 파일명, 크기, 업로드 날짜 표시

### 2. AI 문서 분석

#### 자동 문서 분석 파이프라인
업로드된 문서는 다음과 같은 과정을 거칩니다:

1. **문서 로딩**
   - 형식별 전용 로더 사용 (PDF, DOCX, TXT, CSV, HTML)
   - 문서를 청크 단위로 분할
   - 빈 문서 자동 필터링

2. **AI 분석** (Ollama LLM 사용)
   - **제목 추출**: 문서의 핵심 제목 자동 추출
   - **요약 생성**: 문서 내용을 1000자 이내로 요약
     - 띄어쓰기 포함 정확한 1000자 제한
     - 핵심 내용 보존
   - **키워드 추출**: 문서의 핵심 키워드 50개 자동 추출
     - 쉼표로 구분된 키워드 리스트

3. **메타데이터 저장**
   - 파일 타입 (doc_type) 자동 인식
   - 파일 위치 및 파일명 저장
   - MySQL `documents` 테이블에 저장

#### 중복 방지
- 같은 파일명의 문서는 자동으로 스킵
- DB에 이미 존재하는 파일은 재처리하지 않음

### 3. 벡터스토어 관리

#### 벡터스토어 생성
- **자동 수집**: `documents` 테이블의 모든 문서를 수집
- **임베딩 생성**: Ollama Embeddings로 각 문서 청크를 벡터화
- **ChromaDB 저장**: 벡터 인덱스를 ChromaDB에 저장
- **시간별 저장**: 생성 시점별로 별도 폴더에 저장 (`YYYYMMDD_HHMMSS` 형식)
- **DB 기록**: `vectorStore` 테이블에 생성 정보 저장
  - 폴더명, 문서 수, 생성 시간 저장

#### 벡터스토어 관리
- **목록 조회**: 생성된 모든 벡터스토어 목록 확인
- **최신 자동 선택**: 검색 시 가장 최신 벡터스토어 자동 사용
- **삭제 기능**: 벡터스토어 및 DB 기록 삭제

### 4. AI 문서 검색 (RAG 시스템)

#### RAG 아키텍처
LangGraph를 사용한 멀티 에이전트 시스템으로 구성됩니다:

```
사용자 쿼리
    ↓
[1] extractor_agent: 키워드 추출
    ↓
[2] rag_search_agent: 벡터 검색 + 관련성 계산
    ↓
[3] answer_generator_agent: 문서 기반 답변 생성
    ↓
[4] result_formatter_agent: 결과 포맷팅
    ↓
최종 결과 (텍스트 + 시각화)
```

#### 검색 프로세스

1. **키워드 추출** (`extractor_agent`)
   - 사용자 질문에서 검색을 위한 키워드 추출
   - LLM을 사용하여 최적의 키워드 생성

2. **벡터 검색** (`rag_search_agent`)
   - ChromaDB에서 키워드와 유사한 문서 검색 (상위 10개)
   - 유사도 점수를 0-100% 스케일로 정규화
   - 문서 메타데이터 조회 (MySQL에서 파일명, 요약, 키워드 등)
   - 중복 문서 제거 (동일 문서 ID 중 가장 높은 유사도만 유지)
   - 관련성 순으로 정렬

3. **답변 생성** (`answer_generator_agent`)
   - 검색된 문서들을 컨텍스트로 제공
   - LLM이 사용자 질문에 대한 답변 생성
   - 문서 내용만을 바탕으로 한 답변 (추측 방지)
   - 관련성 높은 상위 3개 파일 추천
   - 최종적으로 1개 파일 추천 (파일명-요약 형식)

4. **결과 포맷팅** (`result_formatter_agent`)
   - 검색 결과와 AI 답변을 구조화된 형식으로 변환
   - 순위, 파일명, 위치, 요약, 키워드, 유형 표시
   - AI 답변 강조 표시

#### 3D 시각화

**구현 방식**:
- **중앙 노드**: 사용자 질문 (빨간색 다이아몬드)
- **주변 노드**: 검색된 문서들
  - **거리**: 관련성이 높을수록 중앙에 가까움
  - **색상**: 관련성에 따라 색상 변화 (Viridis 컬러맵)
  - **크기**: 관련성에 비례하여 크기 조절
- **연결선**: 쿼리와 각 문서 간의 관계 표시 (빨간 점선)
- **레이아웃**: Golden Angle Spiral 배치로 구형 표면에 고르게 분포

**저장 형식**:
- HTML 파일로 저장 (Plotly 기반 인터랙티브 그래프)
- 파일명: `{검색어}_3d_visualization_{YYYYMMDD_HHMMSS}.html`
- 브라우저에서 직접 열어서 확인 가능

#### 관련성 차트
- 막대 그래프로 문서별 관련성 순위 표시
- 파일명과 관련성(%) 함께 표시
- 색상 코딩으로 관련성 시각화

#### 검색 기록 관리

**자동 저장**:
- 모든 검색이 `search_history` 테이블에 자동 저장
- 저장 정보:
  - `query`: 검색 내용
  - `search_result`: 전체 검색 결과 텍스트
  - `ai_answer`: AI 답변만 별도 추출하여 저장
  - `ranking_result`: 검색 결과 순위 리스트 (JSON 형식)
    - 각 결과: rank, file_name, file_location, relevance, keywords, summary, content
  - `html_file_path`: 3D 시각화 HTML 파일 경로
  - `bar_chart_path`: 막대 그래프 HTML 파일 경로
  - `chroma_path`: 사용된 ChromaDB 경로

**재확인 기능**:
- 과거 검색 내역을 리스트로 조회
- 클릭 시 상세 내용 확인
- 저장된 시각화 파일 재확인 가능
- 순위별 메달 표시 (1순위 금메달, 2순위 은메달, 3순위 동메달)

## 📦 설치 및 실행

### 1. 환경 요구사항

- **Node.js**: v14 이상
- **Python**: 3.8 이상
- **MySQL**: 8.0 이상
- **Conda**: Python 환경 관리용
- **Ollama**: 로컬 LLM 실행 엔진
  - 모델 설치 필요: `ollama pull exaone3.5:2.4b`

### 2. MySQL 데이터베이스 설정

#### 데이터베이스 생성
```sql
CREATE DATABASE final CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

#### 테이블 생성
```bash
# MySQL에 접속
mysql -u admin -p final

# SQL 파일 실행
source python/vector_store/DB_Table_documents.sql
source python/vector_store/DB_Table_vecTorStore.sql
source python/rag/DB_Table_search_history.sql
```

또는 MySQL Workbench 등을 통해 SQL 파일을 직접 실행합니다.

#### 테이블 스키마 개요

**documents 테이블**:
- `id`: 문서 ID (Primary Key, AUTO_INCREMENT)
- `title`: 문서 제목 (VARCHAR(512))
- `summary`: 문서 요약 (TEXT)
- `keywords`: 문서 키워드 (VARCHAR(1024))
- `file_location`: 파일 위치 (TEXT)
- `file_name`: 파일명 (VARCHAR(255))
- `doc_type`: 파일 타입 (.pdf, .txt, .docx 등)
- `created_at`: 생성 시간 (TIMESTAMP)

**vectorStore 테이블**:
- `id`: 벡터스토어 ID (Primary Key, AUTO_INCREMENT)
- `folder`: 벡터스토어 폴더명 (YYYYMMDD_HHMMSS 형식)
- `count`: 포함된 문서 수
- `created_at`: 생성 시간 (TIMESTAMP)

**search_history 테이블**:
- `id`: 검색 ID (Primary Key, AUTO_INCREMENT)
- `query`: 검색 내용 (TEXT)
- `search_result`: 전체 검색 결과 텍스트 (TEXT)
- `ai_answer`: AI 답변만 별도 저장 (TEXT)
- `ranking_result`: 검색 결과 순위 리스트 (JSON 형식)
- `html_file_path`: 3D 시각화 HTML 파일 경로 (VARCHAR(512))
- `bar_chart_path`: 막대 그래프 HTML 파일 경로 (VARCHAR(512))
- `chroma_path`: 사용된 ChromaDB 경로 (VARCHAR(512))
- `created_at`: 검색 날짜 (TIMESTAMP)

### 3. Node.js 의존성 설치

```bash
cd /home/alpaco/final_project/website
npm install
```

### 4. Python 환경 설정

#### Conda 환경 생성
```bash
# 파일 업로드/분석용 환경
conda create -n file_upload python=3.8
conda activate file_upload
pip install langchain langchain-community pymysql python-docx pypdf docx2txt

# RAG 검색용 환경
conda create -n file_search python=3.8
conda activate file_search
pip install langchain langchain-community chromadb langgraph ollama plotly numpy
```

#### Ollama 설치 및 모델 다운로드
```bash
# Ollama 설치 (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Ollama 서버 시작
ollama serve

# 모델 다운로드 (별도 터미널에서)
ollama pull exaone3.5:2.4b
```

### 5. 환경 변수 설정

```bash
cp env.example .env
# .env 파일을 편집하여 필요한 환경 변수 설정
```

**DB 설정**:
- 데이터베이스 설정은 `db.js`와 Python 스크립트에서 직접 하드코딩되어 있습니다.
- 기본값: `host: localhost, user: admin, password: 1qazZAQ!, db: final`

⚠️ **보안 주의**: 프로덕션 환경에서는 환경 변수로 관리하세요.

### 6. 서버 실행

#### 개발 모드 (자동 재시작)
```bash
npm run dev
```

#### 프로덕션 모드
```bash
npm start
```

서버는 기본적으로 `http://localhost:5555`에서 실행됩니다.

#### Ollama 서버 실행 확인
Ollama 서버가 실행 중이어야 파일 분석 및 검색이 동작합니다:

```bash
# Ollama 서버 시작
ollama serve

# 서버 상태 확인 (별도 터미널에서)
curl http://localhost:11434/api/tags
```

## 🔧 API 엔드포인트

### 페이지 라우트 (GET)

| 경로 | 설명 |
|------|------|
| `/` | 메인 페이지 |
| `/file_manager` | 파일 관리 페이지 (목록, 검색, 삭제) |
| `/file_upload` | 단일 파일 업로드 페이지 |
| `/folder_upload` | 폴더 업로드 페이지 (진행률 표시) |
| `/vectorstore` | 벡터스토어 관리 페이지 (생성, 목록, 삭제) |
| `/file_search` | AI 문서 검색 페이지 (RAG + 3D 시각화) |

### API 라우트 (REST API)

#### 파일 관리
| Method | 경로 | 설명 | 요청 본문 |
|--------|------|------|-----------|
| GET | `/api/files` | 업로드된 파일 목록 조회 | - |
| DELETE | `/api/delete-file/:filename` | 파일 삭제 | - |

#### 파일 처리
| Method | 경로 | 설명 | 요청 본문 |
|--------|------|------|-----------|
| POST | `/api/run-python` | 단일 파일 AI 처리 | `{ "filePath": "..." }` |
| POST | `/api/run-folder-python` | 폴더 AI 처리 | `{ "folderPath": "..." }` |

#### 벡터스토어 관리
| Method | 경로 | 설명 | 요청 본문 |
|--------|------|------|-----------|
| POST | `/api/create-vectorstore` | 벡터스토어 생성 | - |
| GET | `/api/vectorstore-list` | 벡터스토어 목록 조회 | - |
| DELETE | `/api/delete-vectorstore/:id` | 벡터스토어 삭제 | - |

#### AI 검색
| Method | 경로 | 설명 | 요청 본문 |
|--------|------|------|-----------|
| POST | `/api/ai-search` | AI 검색 실행 (RAG + 3D 시각화) | `{ "query": "..." }` |
| GET | `/api/search-history` | AI 검색 기록 목록 조회 | - |

### 업로드 라우트

| Method | 경로 | 설명 | 요청 형식 |
|--------|------|------|-----------|
| POST | `/file_upload` | 단일 파일 업로드 | `multipart/form-data` (file) |
| POST | `/folder_upload` | 폴더 업로드 | `multipart/form-data` (files[]) |

### 정적 파일 라우트

| 경로 | 설명 |
|------|------|
| `/search-results/*` | AI 검색 결과 HTML 파일 제공 |

## 🎯 사용 방법

### 기본 워크플로우

#### 1. 파일 업로드 및 분석

**단일 파일 업로드**:
1. 메인 페이지에서 "File Manager"로 이동
2. "파일 업로드" 메뉴 선택
3. 파일 선택 (PDF, TXT, DOCX만 가능)
4. 업로드 버튼 클릭
5. 자동으로 AI 분석 시작

**폴더 업로드**:
1. "폴더 업로드" 메뉴 선택
2. 폴더 선택 (여러 파일 포함)
3. 업로드 버튼 클릭
4. 진행률 바로 업로드 및 처리 진행률 확인
   - 업로드 단계: 파일 업로드 진행률
   - 분석 단계: 파일별 AI 분석 진행률

#### 2. 벡터스토어 생성

1. "벡터스토어 만들기" 페이지로 이동
2. 현재 DB에 저장된 모든 문서 확인
3. "벡터 스토어 생성" 버튼 클릭
4. 진행 바로 생성 진행률 확인
5. 생성 완료 후 목록에 추가됨

⚠️ **주의**: 문서를 추가/수정한 후에는 새로운 벡터스토어를 생성해야 검색에 반영됩니다.

#### 3. AI 문서 검색

1. "문서내용 검색파일" 페이지로 이동
2. 검색어 입력 (예: "프로젝트 관리 방법에 대한 문서")
   - 자연어로 질문 가능
   - 키워드도 가능
3. "AI 검색 실행" 버튼 클릭
4. 검색 결과 확인:
   - **AI 답변**: 가장 위에 강조 표시 (파란색 박스)
   - **검색 결과 목록**: 순위별로 문서 목록 표시
     - 순위, 파일명, 위치, 요약, 키워드, 유형
   - **관련성 차트**: 막대 그래프로 문서별 관련성 표시
   - **3D 시각화**: "3D 시각화 보기" 버튼 클릭으로 확인
     - 인터랙티브 그래프 (드래그, 줌 가능)

#### 4. 검색 기록 확인

1. "AI 검색 기록" 섹션에서 과거 검색 내역 확인
2. 기록 클릭 시 상세 내용 확인:
   - 검색 내용, AI 답변, 순위 리스트
   - 3D 시각화 및 막대 그래프 재확인 가능

## 🔍 상세 기능 설명

### RAG 시스템 아키텍처

#### LangGraph 기반 워크플로우

```
┌─────────────────┐
│  사용자 쿼리     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ extractor_agent        │ ← 키워드 추출
│ - LLM으로 키워드 생성   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ rag_search_agent        │ ← 벡터 검색 + 관련성 계산
│ - ChromaDB 검색         │
│ - 관련성 정규화 (0-100%)│
│ - 3D 시각화 업데이트    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ answer_generator_agent  │ ← 답변 생성
│ - 검색 문서를 컨텍스트로│
│ - LLM으로 답변 생성     │
│ - 상위 3개 파일 추천     │
│ - 최종 1개 파일 추천    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ result_formatter_agent  │ ← 결과 포맷팅
│ - 구조화된 형식 변환    │
│ - AI 답변 강조          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────┐
│  최종 결과 출력  │
└─────────────────┘
```

#### 에이전트 상세 설명

**1. extractor_agent**
- **역할**: 사용자 질문에서 검색에 적합한 키워드 추출
- **입력**: 사용자 쿼리 (자연어)
- **처리**: LLM 프롬프트로 키워드 생성
- **출력**: 쉼표로 구분된 키워드 리스트

**2. rag_search_agent**
- **역할**: 벡터 검색 및 관련성 계산
- **처리 과정**:
  1. ChromaDB에서 키워드와 유사한 문서 검색 (상위 10개)
  2. 유사도 점수 정규화 (0-100%)
  3. 중복 문서 제거 (같은 문서 ID 중 최고 점수만 유지)
  4. MySQL에서 문서 메타데이터 조회
  5. 관련성 순으로 정렬
  6. 3D 시각화 데이터 업데이트
- **출력**: 검색 결과 리스트 (파일명, 관련성, 요약 등)

**3. answer_generator_agent**
- **역할**: 검색된 문서를 바탕으로 답변 생성
- **처리 과정**:
  1. 검색된 문서들을 컨텍스트로 제공
  2. LLM으로 사용자 질문에 답변 생성
  3. 문서 내용만 참고 (추측 방지)
  4. 상위 3개 파일 추천 (파일명-요약-키워드-유형)
  5. 최종적으로 1개 파일 추천 (파일명-요약)
- **출력**: 구조화된 답변 텍스트

**4. result_formatter_agent**
- **역할**: 최종 결과 포맷팅
- **처리**:
  - 검색 결과를 순위별로 구조화
  - AI 답변을 강조 표시
  - 파일 정보 정리 (파일명, 위치, 요약, 키워드, 유형)
- **출력**: 포맷팅된 최종 결과 텍스트

### 3D 시각화 상세

#### 배치 알고리즘

**Golden Angle Spiral 배치**:
- 검색된 문서들을 구형 표면에 고르게 분포
- 각도: `theta = i * golden_angle` (방위각)
- 기울기: `phi = π * (u ** skew_power)` (고정도각)
  - `u = (i + 0.5) / n`: 문서 인덱스 정규화
  - `skew_power = 2.0`: 관련성 높은 문서가 z축 양의 방향으로 클러스터링

**거리 계산**:
- 관련성 100% → 거리 0.5 (중앙 가까움)
- 관련성 0% → 거리 4.0 (중앙 멀음)
- 선형 변환: `dist = min_dist + (1 - rel/100) * (max_dist - min_dist)`

**시각적 요소**:
- **쿼리 노드**: 빨간색 다이아몬드, 중앙 고정
- **문서 노드**: 색상/크기 = 관련성, 위치 = 거리
- **연결선**: 빨간 점선으로 쿼리-문서 관계 표시

### 데이터 흐름

```
[1] 파일 업로드
    ↓
[2] 파일 저장 (public/upload/files)
    ↓
[3] Python 스크립트 실행 (file_upload.py 또는 folder_upload.py)
    ↓
[4] 문서 로딩 (형식별 전용 로더)
    ↓
[5] AI 분석 (Ollama LLM)
    - 제목 추출
    - 요약 생성
    - 키워드 추출
    ↓
[6] MySQL 저장 (documents 테이블)
    ↓
[7] 벡터스토어 생성 (vector_store_create.py)
    ↓
[8] 문서 임베딩 생성 (Ollama Embeddings)
    ↓
[9] ChromaDB 저장 (벡터 인덱스)
    ↓
[10] 검색 요청
     ↓
[11] RAG 시스템 실행 (3d_file_search.py)
     ↓
[12] 키워드 추출 → 벡터 검색 → 답변 생성 → 결과 포맷팅
     ↓
[13] 3D 시각화 생성 (Plotly)
     ↓
[14] HTML 파일 저장 + DB 기록 저장 (search_history)
```

## 🔐 보안 및 설정

### 데이터베이스 보안

**현재 설정** (프로덕션 권장 안 함):
```javascript
// db.js
const DB_CONFIG = {
    host: 'localhost',
    user: 'admin',
    password: '1qazZAQ!',  // ⚠️ 하드코딩된 비밀번호
    database: 'final',
    charset: 'utf8mb4'
};
```

**개선 권장사항**:
1. 환경 변수로 비밀번호 관리
2. `.env` 파일을 `.gitignore`에 추가
3. 프로덕션 환경에서는 강력한 비밀번호 사용

### 파일 업로드 보안

- **파일 크기 제한**: 10MB
- **파일 형식 제한**: 허용된 MIME 타입만 허용
- **한글 파일명**: UTF-8 인코딩 처리
- **파일명 안전 처리**: 특수문자 제거

### Ollama 서버 보안

- 현재는 로컬호스트(`localhost`)에서만 접근 가능
- 외부 접근을 허용하려면 Ollama 서버 설정 변경 필요

## 🐛 트러블슈팅

### Ollama 서버 오류

**문제**: "Ollama 서버가 꺼져 있습니다" 오류

**해결**:
1. Ollama 서버 실행 확인:
   ```bash
   ps aux | grep ollama
   ```
2. Ollama 서버 시작:
   ```bash
   ollama serve
   ```
3. 모델 설치 확인:
   ```bash
   ollama list
   ```
4. 모델이 없으면 설치:
   ```bash
   ollama pull exaone3.5:2.4b
   ```

### Python 환경 오류

**문제**: "conda: command not found" 또는 Python 패키지 오류

**해결**:
1. Conda 설치 확인:
   ```bash
   which conda
   conda --version
   ```
2. Conda 환경 활성화:
   ```bash
   conda activate file_upload  # 또는 file_search
   ```
3. 필요한 패키지 재설치:
   ```bash
   pip install -r requirements.txt  # 있다면
   # 또는 개별 설치
   pip install langchain langchain-community chromadb ...
   ```

### MySQL 연결 오류

**문제**: "MySQL 데이터베이스 연결 실패"

**해결**:
1. MySQL 서버 실행 확인:
   ```bash
   sudo service mysql status
   # 또는
   systemctl status mysql
   ```
2. 데이터베이스 생성 확인:
   ```sql
   SHOW DATABASES;
   ```
3. 테이블 생성 확인:
   ```sql
   USE final;
   SHOW TABLES;
   ```
4. 사용자 권한 확인:
   ```sql
   SELECT User, Host FROM mysql.user WHERE User='admin';
   ```

### 벡터스토어 검색 오류

**문제**: "벡터스토어를 찾을 수 없습니다"

**해결**:
1. 벡터스토어 생성 여부 확인:
   - 벡터스토어 관리 페이지에서 목록 확인
2. ChromaDB 폴더 존재 확인:
   ```bash
   ls -la python/vector_store/rag_chroma/documents/
   ```
3. 벡터스토어 재생성:
   - 벡터스토어 관리 페이지에서 "벡터 스토어 생성" 실행

### 파일 업로드 오류

**문제**: "파일 크기가 너무 큽니다" 또는 "지원하지 않는 파일 형식"

**해결**:
1. 파일 크기 확인 (10MB 제한)
2. 지원 형식 확인:
   - 단일 업로드: PDF, TXT, DOCX만
   - 폴더 업로드: PDF, DOCX, CSV, TXT, HTML
3. 파일명 특수문자 확인 (특수문자가 많으면 오류 가능)

### 3D 시각화 파일 생성 오류

**문제**: 시각화 HTML 파일이 생성되지 않음

**해결**:
1. Python 스크립트 실행 권한 확인
2. 출력 디렉토리 생성 확인:
   ```bash
   mkdir -p python/rag/search
   chmod 755 python/rag/search
   ```
3. Plotly 패키지 설치 확인:
   ```bash
   conda activate file_search
   pip install plotly
   ```

## 📝 라이선스

ISC License

## 👥 프로젝트 개발자

김윤성성

---

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

---

**주의사항**: 이 프로젝트는 개발/테스트 목적으로 제작되었습니다. 프로덕션 환경에서 사용하기 전에 보안 설정을 강화하고 환경 변수를 적절히 설정해주세요.
