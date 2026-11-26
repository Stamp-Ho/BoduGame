# 보두게임

Next.js App Router 기반의 아발론·주루마블 프로젝트다. 서비스의 접근 및 공유 정책은 [서비스 기획서](docs/game-access-plan.md)에 정리되어 있다.

## 로컬 실행

```sh
npm ci
npm run dev
```

기본 주소는 `http://localhost:3000`이다. 게임 목록을 불러오려면 아래 Supabase 연결 설정이 필요하다.

## 로그인 연결

1. Supabase 프로젝트에 `supabase/migrations/20261125000100_game_sessions.sql`을 적용한다.
2. Google 웹 애플리케이션의 리다이렉트 URI를 `<APP_ORIGIN>/auth/callback`으로 등록한다.
3. Supabase Auth에서 Google 제공자를 활성화하고 Google 앱과 같은 클라이언트 ID를 등록한다. ID 토큰의 nonce 검증을 활성화한다.
4. 루트의 `.env.local`에 아래 환경 변수를 설정하고 서버를 재시작한다. 배포할 때는 HTTPS 서비스 주소를 사용한다.

```dotenv
APP_ORIGIN=http://localhost:3000
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

DB의 프로필과 세션 저장에는 서버 전용 Supabase secret key 또는 service_role 키를 사용한다.

## 서버와 브라우저의 경계

### 게임 이관 소스와 SQL

`handoff/`에는 ZIP의 화면, 게임 엔진, 훅, 인증 코드와 인계 문서가 원본 경로대로 들어 있다. 기존 이름·비밀번호 로그인과 브라우저용 Supabase 구독 코드도 포함되어 있어, 이관본은 실행 중인 App Router와 분리했다. 실행 경로인 /avalon과 /boardgame에서는 현재 앱의 서버 세션과 Server Action을 사용한다.

새 DB에는 `supabase/migrations/`의 SQL을 파일명 순서대로 적용한다. 로그인 마이그레이션을 이미 적용한 프로젝트는 `20261125000200_boardgames.sql`부터 적용한다. 아래 SQL은 이 프로젝트의 로그인 스키마를 기준으로 한 신규 게임 테이블용이다.

| 파일 끝 이름 | 내용 |
| --- | --- |
| `boardgames.sql` | UUID 소유자, 공개 설정, 타일·경로·황금카드 |
| `boardgame_sharing.sql` | 목록·상세 조회, 뷰어·편집자, 초대 영수증과 회수, 실명 검색 허용 |
| `boardgame_edit_leases.sql` | UUID 기반 타일 편집 잠금의 획득·연장·저장·정리 |
| `avalon_rooms.sql` | 방 생성·설정, 비공개 코드 입장, 실명 확인, 참가자 표시 이름, 서버용 변경 신호 |
| `avalon_results.sql` | 종료 시 닉네임으로 전적 기록, MVP 득표, 개인·진영 통계 |
| `boardgame_creation.sql` | 일반 사용자별 보드 생성 한도 2개, 소유 여부와 관리 권한을 구분하는 목록 조회 |

게임 RPC의 `p_actor`에는 서버가 세션에서 확인한 프로필 UUID를 전달한다. 비로그인 공개 보드 조회는 `null`을 전달한다. 실명·이메일 초대는 찾은 계정에 즉시 편집 권한을 부여하며 관리 화면에는 `list_boardgame_grants`의 결과를 사용한다. 아발론은 엔진의 `initialState`로 방을 생성하고, 진행 상태를 저장할 때 기존 `version`을 조건으로 사용한다. 서버에서 참가자별 게임 뷰를 만들고 방 안의 이름은 `avalon_room_names`로 조회한다.

### 실행 중인 앱

공개 페이지와 계정 메뉴는 서버 컴포넌트다. 브라우저의 로그인 모달은 Server Action을 호출한다. 제공자 인증 후 Next.js 콜백이 코드를 교환하고 Supabase Auth에서 ID 토큰을 검증한다. 브라우저에는 HttpOnly 쿠키로 임의 세션 ID를 발급하며 DB에는 그 해시와 만료 시각을 저장한다. 세션은 30일간 유효하며 로그아웃하면 서버에서 폐기한다.

Supabase SDK와 비밀 키는 `server/auth`의 `server-only` 모듈에서 사용한다. 공통 UI는 `components`, 게임별 화면은 `app/avalon`과 `app/boardgame`에 둔다. Tailwind 유틸리티는 PostCSS가 app과 components의 사용처를 기준으로 생성한다.

```sh
npm run lint
npm run build
```
