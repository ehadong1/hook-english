import streamlit as st
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# 환경변수 로드
load_dotenv()
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# 화면 기본 설정
st.set_page_config(page_title="Hook English", page_icon="🚀")

# ---------------------------------------------------------
# 1. 앱의 기억력(Session State) 설정
# 'survey_completed'라는 기억이 없으면 False(안 함)로 설정
# ---------------------------------------------------------
if 'survey_completed' not in st.session_state:
    st.session_state.survey_completed = False


# ---------------------------------------------------------
# 2. 서베이 화면 (아직 서베이를 안 했을 때 보여줌)
# ---------------------------------------------------------
if not st.session_state.survey_completed:
    st.title("🎯 나만의 맞춤형 비즈니스 영어 설정")
    st.markdown("본인의 직무와 관심사를 선택해 주시면, 딱 맞는 비즈니스 표현을 수집해 드립니다.")
    
    with st.form("survey_form"):
        # 유저가 선택할 수 있는 보기 옵션들
        job_role = st.selectbox(
            "현재 가장 밀접한 직무 경험을 선택해 주세요.", 
            ["Product Manager (기획/PM)", "Engineer (엔지니어)", "Marketer (마케팅)", "기타"]
        )
        
        industry_interest = st.selectbox(
            "가장 관심 있는 비즈니스 및 산업 분야는 무엇인가요?", 
            ["Tech & Battery (첨단 기술/이차전지)", "Economics & Management (경제/경영학)", "General Business (일반 비즈니스)"]
        )
        
        # 제출 버튼
        submitted = st.form_submit_button("설정 완료하고 내 맞춤 문장 보기")
        
        if submitted:
            # 버튼을 누르면 서베이 완료 상태로 변경하고 화면을 새로고침
            st.session_state.survey_completed = True
            st.rerun()

# ---------------------------------------------------------
# 3. 메인 화면 (서베이를 완료했을 때 보여줌)
# ---------------------------------------------------------
else:
    st.title("나만을 위한 맞춤형 비즈니스 영어 문장 🎯")
    
    # 다시 설정하기 버튼 (서베이로 돌아가는 기능)
    if st.button("🔄 서베이 다시 하기"):
        st.session_state.survey_completed = False
        st.rerun()
        
    st.markdown("---")

    # DB에서 데이터 가져오기
    try:
        response = supabase.table("hook_sentences").select("*").execute()
        data = response.data
        
        if not data:
            st.info("아직 수집된 문장이 없습니다. 터미널에서 main.py를 실행해 보세요!")
        else:
            # 데이터를 최신순으로 보여주기
            for item in reversed(data):
                with st.expander(f"🇬🇧 {item['original_text']}"):
                    st.write(f"🇰🇷 **해석:** {item['korean_translation']}")
                    st.write(f"💡 **문법 포인트:** {item['grammar_point']}")
                    st.info(f"📊 난이도: **{item['difficulty']}** | 🏷️ 카테고리: **{item['category']}**")
    except Exception as e:
        st.error(f"데이터를 불러오는 중 오류가 발생했습니다: {e}")