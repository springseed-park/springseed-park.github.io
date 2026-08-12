# MAISON ÉLAN AI relay

Groq 비밀키를 브라우저에 노출하지 않고 전달하는 작은 Cloudflare Worker입니다. 쇼핑몰 본체는 계속 GitHub Pages에 유지됩니다.

## 로컬 실행

1. `chatbot-worker/.dev.vars.example`을 참고해 같은 폴더의 `.dev.vars`에 발급받은 Groq 키를 입력합니다.
2. 첫 번째 터미널에서 `npm run chatbot:dev`를 실행합니다.
3. 두 번째 터미널에서 `npm run dev`를 실행합니다.
4. `http://localhost:3001`에서 오른쪽 아래 `ÉLAN AI` 버튼을 확인합니다.

로컬 쇼핑몰은 별도 환경변수가 없어도 `http://localhost:8787`의 중계 서버를 자동 사용합니다. `.dev.vars`는 Git에서 제외되며 API 키를 프런트 코드나 `NEXT_PUBLIC_` 변수에 넣으면 안 됩니다.

중계 서버는 허용 출처 검사와 함께 세션당 10회/분, 접속자당 30회/분, 전체 120회/분의 다중 제한을 적용합니다. 운영 중 비정상 사용이 보이면 Cloudflare Turnstile을 추가하고 Groq 콘솔에서 조직별 한도를 더 낮게 설정합니다.

## 나중에 배포할 때

사용자가 배포를 요청한 뒤에만 Worker 로그인, `GROQ_API_KEY` secret 등록, Worker 배포, GitHub의 `CHATBOT_API_URL` Repository Variable 설정, GitHub Pages 재배포를 순서대로 진행합니다.
