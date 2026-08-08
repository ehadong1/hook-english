import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. .env 파일에서 암호 키 불러오기
load_dotenv()

# 2. OpenAI & Supabase 세팅 (연결 준비)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

supabase_url: str = os.getenv("SUPABASE_URL")
supabase_key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def extract_hook_with_openai(article_text):
    print("⏳ OpenAI(GPT-4o-mini)가 문장을 추출 중입니다...")
    
    prompt = """
    너는 실리콘밸리 비즈니스 영어 코치야. 다음 기사에서 직장인들이 당장 써먹기 좋은 가장 세련된 영어 문장 딱 1개만 뽑아줘.
    반드시 다음 JSON 형식으로만 출력해: 
    {
        "original_text": "영어 원문",
        "korean_translation": "한국어 번역",
        "grammar_point": "핵심 문법 및 표현 설명",
        "difficulty": "초급, 중급, 고급 중 택 1",
        "category": "기사 카테고리 (예: IT, 경영전략)"
    }
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={ "type": "json_object" },
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": article_text}
        ]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    # 테스트용 가짜 기사
    sample_article = "Apple announced a new AI strategy today, aiming to seamlessly integrate machine learning into its core operating systems. This move is expected to significantly impact the tech industry."
    
    # [STEP 1] AI로 핵심 문장 추출
    result_json_str = extract_hook_with_openai(sample_article)
    
    # 텍스트(문자열)로 된 JSON을 파이썬이 다룰 수 있는 딕셔너리로 변환
    result_data = json.loads(result_json_str) 
    print("\n--- 📝 OpenAI 추출 완료 ---")
    print(result_data)
    
    # [STEP 2] Supabase DB에 자동 저장 (Insert)
    print("\n⏳ Supabase DB에 저장 중...")
    
    try:
        # hook_sentences 테이블에 데이터를 꽂아 넣습니다.
        response = supabase.table('hook_sentences').insert(result_data).execute()
        print("✅ DB 저장 성공! Supabase 사이트에서 테이블을 확인해보세요.")
    except Exception as e:
        print(f"❌ DB 저장 실패: {e}")