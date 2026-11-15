-- AI 생성 표현의 문법 키를 앱 해설 라이브러리(GRAMMAR_LIBRARY)의 키로 바로잡습니다.
-- Supabase SQL Editor에서 한 번 실행하세요. (여러 번 실행해도 안전합니다)
update public.hook_phrase_bank set grammar_key = 'conditionalPossibility' where grammar_key = 'conditional';
update public.hook_phrase_bank set grammar_key = 'modalSuggestion' where grammar_key in ('modal', 'suggestion');
update public.hook_phrase_bank set grammar_key = 'nearFuture' where grammar_key = 'futurePlan';
update public.hook_phrase_bank set grammar_key = 'concessiveContrast' where grammar_key = 'contrast';
update public.hook_phrase_bank set grammar_key = 'idiomaticExpression' where grammar_key in ('reason', 'presentPerfect', 'passive', 'comparison');
