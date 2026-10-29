# Style Master — AI Personal Fashion Stylist

체형과 TPO(시간·장소·상황)를 바탕으로 2026 트렌드 스타일 조언과 화보 이미지를 만들어 주는 앱입니다.
Google Gemini를 사용하며, API 키는 서버에서만 사용되어 방문자에게 노출되지 않습니다.

## 이 앱은 서버가 필요합니다

이 앱은 Node.js 서버(`server.ts`)가 Gemini를 호출하는 구조라서 **GitHub Pages에서는 작동하지 않습니다.**
Render, Google Cloud Run처럼 Node.js 서버를 실행할 수 있는 곳에 배포해야 합니다.

## 내 Mac에서 실행하기

필요한 것: Node.js 20 이상, Gemini API 키 (https://aistudio.google.com/apikey)

```bash
npm install
cp .env.example .env.local   # 그리고 .env.local 안에 내 API 키를 넣기
export $(cat .env.local | xargs) && npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

## 서버 호스팅에 배포하기

호스팅 서비스의 설정 화면에 아래 값을 넣습니다.

| 항목 | 값 |
|---|---|
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| 환경 변수 `GEMINI_API_KEY` | 내 Gemini API 키 (필수) |
| 환경 변수 `DAILY_LIMIT` | 방문자 1명당 하루 스타일 생성 횟수 (선택, 기본 10) |

## 사용 제한

링크를 공유해도 요금이 과하게 나오지 않도록, 방문자(IP 주소) 1명당 하루 `DAILY_LIMIT`번까지만
스타일을 만들 수 있습니다. 횟수는 날짜가 바뀌거나 서버가 다시 시작되면 초기화됩니다.
