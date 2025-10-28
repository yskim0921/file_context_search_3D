import os
import sys
import json
import pymysql
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from datetime import datetime

# ================================================================
# 1. 설정
# ================================================================

# MySQL 설정
DB_CONFIG = {
    'host': 'localhost',
    'user': 'admin',
    'password': '1qazZAQ!',
    'db': 'final',
    'charset': 'utf8mb4'
}

# 임베딩 모델
EMBEDDINGS = OllamaEmbeddings(model="exaone3.5:2.4b")

# ================================================================
# 2. MySQL에서 문서 메타데이터 가져오기 함수
# ================================================================
def get_document_metadata(doc_id):
    """MySQL에서 doc_id에 해당하는 문서 메타데이터 반환"""
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("SELECT file_name, file_location, summary, keywords, doc_type FROM documents WHERE id = %s", (doc_id,))
            row = cursor.fetchone()
        conn.close()
        return row if row else {}
    except Exception as e:
        print(f"⚠️ MySQL 조회 실패 (ID: {doc_id}): {e}")
        return {}

# ================================================================
# 3. 유사도 검색 및 결과 출력 함수
# ================================================================
def search_similar_documents(query: str, chroma_path: str, top_k: int = 5):
    """벡터스토어에서 쿼리와 유사한 문서 검색 + 유사도 계산 + 포맷 출력"""
    print(f"\n🔍 '{query}' 에 대한 유사도 검색 시작...", file=sys.stderr)
    
    try:
        # 1. ChromaDB 로드
        vectorstore = Chroma(persist_directory=chroma_path, embedding_function=EMBEDDINGS)
        
        # 2. 유사도 검색 (score 포함)
        results = vectorstore.similarity_search_with_score(query, k=top_k)
        
        if not results:
            print("❌ 검색 결과 없음.", file=sys.stderr)
            return []
        
        # 3. 유사도 점수 추출 → 정규화 (0~100%)
        scores = [score for _, score in results]
        min_score = min(scores)
        max_score = max(scores)
        
        print(f"\n📊 유사도 범위: 최소 {min_score:.4f} ~ 최대 {max_score:.4f}", file=sys.stderr)
        
        # 4. 결과 정리
        search_results = []
        for i, (doc, score) in enumerate(results, 1):
            doc_id = doc.metadata.get("id")
            metadata = get_document_metadata(doc_id) if doc_id else {}
            
            # 유사도 계산: ChromaDB는 낮은 점수가 더 유사함
            # 거리를 유사도로 변환: 1 / (1 + distance) 형태
            # 실제 유사도: score가 낮을수록 (거리가 가까울수록) 유사도가 높음
            if max_score != min_score:
                # 정규화 후 역변환: 가장 낮은 점수를 100%로, 가장 높은 점수를 2%로
                relevance = (1 - (score - min_score) / (max_score - min_score)) * 98 + 2  # 2~100%
            else:
                relevance = 98.0
            
            # 추가: 원본 거리 점수도 저장 (디버깅용)
            distance_score = score
            
            result_item = {
                "rank": i,
                "relevance": round(relevance, 1),  # 유사도 (2~100%)
                "distance": round(distance_score, 4),  # 거리 점수 (낮을수록 유사)
                "file_name": metadata.get("file_name", "unknown"),
                "file_location": metadata.get("file_location", ""),
                "summary": metadata.get("summary", "요약 없음")[:100] + "...",
                "keywords": metadata.get("keywords", "키워드 없음"),
                "doc_type": metadata.get("doc_type", ""),
                "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content
            }
            search_results.append(result_item)
        
        # 5. 결과 출력 (stderr로 디버그 출력)
        print(f"\n✅ 상위 {len(search_results)}개 결과:", file=sys.stderr)
        print("="*80, file=sys.stderr)
        for res in search_results:
            print(f"\n--- {res['rank']}순위 ({res['relevance']}%) ---", file=sys.stderr)
            print(f"📄 파일명: {res['file_name']}", file=sys.stderr)
            print(f"   📁 위치: {res['file_location']}", file=sys.stderr)
            print(f"   📝 요약: {res['summary']}", file=sys.stderr)
            print(f"   🗝️ 키워드: {res['keywords']}", file=sys.stderr)
            print(f"   🧩 내용 미리보기: {res['content_preview']}", file=sys.stderr)
            print("-" * 80, file=sys.stderr)
        
        return search_results
        
    except Exception as e:
        print(f"❌ 검색 중 오류 발생: {e}", file=sys.stderr)
        return []

# ================================================================
# 4. 메인 실행
# ================================================================
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("❌ 사용법: python vector_store_search.py '<검색질문>' '<벡터스토어경로>'", file=sys.stderr)
        print(json.dumps([]))
        exit(1)
    
    query = sys.argv[1]
    chroma_path = sys.argv[2]
    
    # 검색 실행
    results = search_similar_documents(query, chroma_path, top_k=5)
    
    # JSON으로 결과 출력 (stdout)
    print(json.dumps(results, ensure_ascii=False, indent=2))
    
    if results:
        print(f"\n🎉 총 {len(results)}개 문서 검색 완료.", file=sys.stderr)
    else:
        print("\n😔 검색 결과가 없습니다.", file=sys.stderr)