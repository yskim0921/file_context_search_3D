"""
Ollama 모델 설정 중앙화 파일

이 파일에서 모델명을 한 번만 변경하면 모든 Python 파일에 적용됩니다.
"""
from langchain_community.llms import Ollama
from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings

# ================================================================
# 모델 설정 (여기서만 변경하면 모든 파일에 적용됨)
# ================================================================
# MODEL_NAME = "exaone3.5:2.4b"
MODEL_NAME = "exaone3.5:7.8b"
TEMPERATURE = 0.1

# 실행방법
# ollama serve
# ollama run exaone3.5:2.4b
# ollama run exaone3.5:7.8b
#ollama serve & ollama run ollama-exaone3.5:7.8b


# ================================================================
# 모델 인스턴스 (전역 변수로 생성하여 재사용)
# ================================================================
EMBEDDINGS = OllamaEmbeddings(model=MODEL_NAME)
LLM = Ollama(model=MODEL_NAME)
CHAT_LLM = ChatOllama(model=MODEL_NAME, temperature=TEMPERATURE)

