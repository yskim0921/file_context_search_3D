# vector_store_create.py
"""
MySQL에서 documents(title, summary)를 로드하여
LangChain + Ollama Embeddings으로 Chroma 벡터스토어를 생성하고
생성 시점(날짜시간)별로 저장 경로를 분리하는 스크립트
"""

import os
import pymysql
from datetime import datetime
from langchain_core.documents import Document
from langchain_text_splitters import CharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma


# ==============================
# 1. MySQL 접속 정보
# ==============================
DB_CONFIG = {
    'host': 'localhost',
    'user': 'admin',
    'password': '1qazZAQ!',
    'db': 'final',
    'charset': 'utf8mb4'
}


# ==============================
# 2. RAG Chroma 구축 함수
# ==============================
def build_rag_chroma():
    conn = None
    documents = []

    try:
        # MySQL 연결
        conn = pymysql.connect(**DB_CONFIG)
        print("✅ MySQL 연결 성공")

        with conn.cursor() as cursor:
            cursor.execute("SELECT id, title, summary FROM documents")
            rows = cursor.fetchall()

            if not rows:
                print("⚠️ 로드된 데이터가 없습니다. 'documents' 테이블을 확인해주세요.")
                return

            # Document 객체 리스트 생성
            for row in rows:
                doc_id = row[0]
                title_text = (row[1] or "").strip()
                summary_text = (row[2] or "").strip()

                if title_text and summary_text:
                    combined_text = f"{title_text}. {summary_text}"
                elif title_text:
                    combined_text = title_text
                else:
                    combined_text = summary_text

                if not combined_text:
                    continue

                doc = Document(
                    page_content=combined_text,
                    metadata={
                        "source": "mysql",
                        "table": "documents",
                        "id": doc_id,
                        "title": title_text
                    }
                )
                documents.append(doc)

            print(f"✅ MySQL에서 {len(documents)}개 문서 로드 완료")

            # 상위 5개 문서 미리보기
            for i, doc in enumerate(documents[:5]):
                print(f"\n--- 문서 #{i + 1} (ID: {doc.metadata.get('id', 'N/A')}) ---")
                print(f"  Title: {doc.metadata.get('title', '')}")
                print(f"  Metadata: {doc.metadata}")
                print(f"  Content (일부): {doc.page_content[:200]}...")

    except pymysql.Error as err:
        print(f"❌ MySQL 오류: {err}")
        return
    finally:
        if conn:
            conn.close()
            print("🔒 MySQL 연결 해제")

    if not documents:
        print("⚠️ 유효한 문서가 없어 벡터스토어를 생성하지 않습니다.")
        return

    # 텍스트 분할 (청킹)
    splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)
    split_docs = splitter.split_documents(documents)
    print(f"\n✅ 청킹 완료. 총 {len(split_docs)}개 청크 생성")

    # 임베딩 모델 설정
    try:
        embeddings = OllamaEmbeddings(model="exaone3.5:2.4b")
        print("✅ 임베딩 모델 설정 완료")
    except Exception as e:
        print(f"❌ 임베딩 모델 설정 오류: {e}")
        print("   Ollama 서버가 실행 중인지, 임베딩 가능한 모델인지 확인하세요.")
        return

    # ==============================
    # ⏳ 벡터스토어 생성 및 저장 (날짜시간 경로)
    # ==============================
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    rag_path = f"./python/vector_store/rag_chroma/documents/{now}/"

    # 폴더 자동 생성
    os.makedirs(rag_path, exist_ok=True)

    print(f"\n⏳ 벡터스토어 생성 중... (경로: {rag_path})")

    db = Chroma.from_documents(
        documents=split_docs,
        embedding=embeddings,
        persist_directory=rag_path
    )
    db.persist()

    print(f"\n🎉 RAG Chroma 벡터스토어 구축 완료!")
    print(f"   저장 경로: {rag_path}")

    # ==============================
    # MySQL에 벡터스토어 정보 저장
    # ==============================
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            # vectorStore 테이블에 정보 저장
            sql = """
                INSERT INTO vectorStore (folder, count, created_at)
                VALUES (%s, %s, %s)
            """
            cursor.execute(sql, (now, len(documents), datetime.now()))
            conn.commit()
        print(f"✅ 벡터스토어 정보를 MySQL에 저장 완료")
        print(f"   폴더: {now}")
        print(f"   문서 수량: {len(documents)}개")
    except pymysql.Error as err:
        print(f"⚠️ MySQL 저장 오류: {err}")
    finally:
        if conn:
            conn.close()


# ==============================
# 3. 실행부
# ==============================
if __name__ == "__main__":
    build_rag_chroma()
