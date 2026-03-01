# Note Gate v2.0 - AI 기능 개발 명세서

## 📋 개요

**프로젝트**: Note Gate AI Features
**버전**: 2.0.0
**작성일**: 2025-12-18
**작성자**: Claude Code
**UX 철학**: "90%의 작업은 원클릭, 복잡한 작업만 모달"

---

## 🎯 목표

Note Gate 플러그인에 AI 기반 웹 클리핑 및 노트 생성 기능을 추가하여, 사용자가 웹 콘텐츠를 **최소한의 클릭**으로 효율적으로 수집하고 분석할 수 있도록 한다.

---

## 🧠 사용자 워크플로우 분석

### 사용 빈도별 시나리오

| 빈도 | 시나리오 | 기대 UX | 클릭 수 |
|------|----------|---------|---------|
| **매우 높음** | "이 글 저장" | 원클릭 저장 | 1 |
| **높음** | "선택 텍스트 저장" | 선택 → 클릭 | 2 |
| **보통** | "AI로 요약해서 저장" | 클릭 → 자동 처리 | 1-2 |
| **낮음** | "특정 노트에 추가" | 드롭다운 선택 | 2-3 |
| **드묾** | "여러 소스 종합 분석" | 모달 OK | 3-5 |

### 핵심 UX 원칙

1. **원클릭 우선**: 기본 동작은 클릭 한 번으로 완료
2. **스마트 기본값**: 마지막 설정 기억, 자동 추론
3. **점진적 공개**: 고급 옵션은 필요할 때만 표시
4. **인라인 피드백**: 모달 대신 토스트/드롭다운 활용
5. **컨텍스트 메뉴**: 우클릭으로 모든 옵션 접근

---

## 📦 구현 기능

### 1. 스마트 웹 클리핑 (Smart Web Clipping)
- **원클릭 저장**: 버튼 클릭 → 즉시 기본 폴더에 저장
- **선택 텍스트 감지**: 텍스트 선택 시 자동으로 선택 영역만 저장
- **메타데이터 자동 수집**: 제목, URL, 날짜, 작성자
- **드롭다운 옵션**: 저장 위치, AI 처리 선택 (모달 없음)

### 2. AI 노트 생성 (AI Note Generation)
- **원클릭 AI**: 버튼 클릭 → 기본 템플릿으로 즉시 처리
- **드롭다운 템플릿**: 클릭 홀드 시 템플릿 선택
- **인라인 프로그레스**: 버튼이 진행률 표시로 변환
- **커스텀 프롬프트**: 설정에서 저장, 드롭다운에서 선택

### 3. 통합 분석 (1개~N개 문서)
- **단일/멀티 소스 통합**: 1개 문서도, 여러 문서도 동일한 방식으로 분석
- **클리핑 수집 노트**: 특수 형식의 마크다운 노트에 클리핑 저장
- **노트 내 분석**: 노트에서 직접 분석 실행 (코드블록 명령어)
- **빠른 설정 모달**: 모델/템플릿/프롬프트를 한 곳에서 설정

---

## 🤖 지원 AI 프로바이더

| Provider | 기본 모델 | API Endpoint |
|----------|----------|--------------|
| **Google Gemini** | `gemini-2.5-flash` | `https://generativelanguage.googleapis.com/v1beta` |
| **xAI Grok** | `grok-4-1-fast` | `https://api.x.ai/v1` |
| **Anthropic Claude** | `claude-sonnet-4-5-20241022` | `https://api.anthropic.com/v1` |
| **OpenAI** | `gpt-5` | `https://api.openai.com/v1` |
| **Zhipu AI (GLM)** | `glm-4.6` | `https://open.bigmodel.cn/api/paas/v4` |

### 사용자 설정 옵션
- 프로바이더 선택
- 기본 모델 자동 설정 (변경 가능)
- 커스텀 모델명 직접 입력
- API 키 입력 (보안 저장)

---

## 🎨 UI/UX 설계 (간소화 버전)

### 핵심: 모달 최소화, 인라인 액션 극대화

**기존 7개 모달 → 1개 모달 + 드롭다운/컨텍스트 메뉴**

---

### 1. Gate Top Bar 확장 (스마트 버튼)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Tab1] [Tab2] [+]                                               │
├─────────────────────────────────────────────────────────────────┤
│ [←] [→] [🏠] │ https://example.com     │ [📋▼] [🤖▼] [Insert▼] │
└─────────────────────────────────────────────────────────────────┘
```

**스마트 버튼 동작**:

| 버튼 | 클릭 | 길게 클릭/▼ 클릭 |
|------|------|------------------|
| 📋 Clip | 원클릭 저장 (기본 폴더) | 드롭다운 옵션 |
| 🤖 AI | 원클릭 요약 (기본 템플릿) | 드롭다운 옵션 |
| Insert | 현재 노트에 삽입 | 위치 선택 |

---

### 2. 클립 드롭다운 (모달 없음)

**트리거**: [📋▼] 클릭

```
┌─────────────────────────────┐
│ 📋 Quick Clip               │
├─────────────────────────────┤
│ ✅ 새 노트로 저장           │  ← 기본값 (체크 표시)
│    기존 노트에 추가...      │  ← 클릭 시 노트 검색
│    클립보드에 복사          │
├─────────────────────────────┤
│ 📁 저장 폴더: Clippings     │  ← 클릭 시 폴더 선택
├─────────────────────────────┤
│ 🤖 AI 처리 포함             │  ← 토글
│ ⚙️ 클립 설정...             │
└─────────────────────────────┘
```

**동작 흐름**:
1. 클릭 → 즉시 실행 (체크된 옵션으로)
2. 완료 → Toast 알림: "✅ 저장됨: AI 트렌드.md [열기]"

---

### 3. AI 드롭다운 (모달 없음)

**트리거**: [🤖▼] 클릭

```
┌─────────────────────────────┐
│ 🤖 AI Actions               │
├─────────────────────────────┤
│ ✅ 📝 요약                   │  ← 기본값
│    🎯 핵심 포인트            │
│    📚 학습 노트              │
│    📊 분석 리포트            │
├─────────────────────────────┤
│ 💬 저장된 프롬프트          │
│    ├─ 한국어 번역            │
│    ├─ 3줄 요약               │
│    └─ 비판적 분석            │
├─────────────────────────────┤
│ ✏️ 직접 입력...             │  ← 인라인 텍스트 입력
├─────────────────────────────┤
│ ⚙️ AI 설정...               │
└─────────────────────────────┘
```

**"직접 입력" 선택 시** (인라인 확장):

```
┌─────────────────────────────┐
│ 🤖 AI Actions               │
├─────────────────────────────┤
│ ✏️ 직접 입력                │
│ ┌─────────────────────────┐ │
│ │ 이 글을 초등학생도 이해  │ │
│ │ 할 수 있게 설명해줘_    │ │
│ └─────────────────────────┘ │
│ □ 이 프롬프트 저장          │
│ [실행]              [취소]  │
└─────────────────────────────┘
```

---

### 4. 인라인 프로그레스 (모달 없음)

**AI 실행 시 버튼이 진행 상태로 변환**:

```
실행 전:  [🤖▼]
실행 중:  [🔄 45%]     ← 버튼이 프로그레스로 변환
완료:     [✅]         ← 2초 후 원래대로

+ Toast 알림: "✅ AI 요약 완료 [노트 열기]"
```

---

### 5. 우클릭 컨텍스트 메뉴 (Gate 내부)

**트리거**: Gate webview 내에서 우클릭

```
┌─────────────────────────────┐
│ 📋 선택 영역 클리핑         │  ← 텍스트 선택 시만 표시
│ 📋 페이지 전체 클리핑       │
├─────────────────────────────┤
│ 🤖 선택 영역 AI 요약        │  ← 텍스트 선택 시만 표시
│ 🤖 페이지 AI 요약           │
├─────────────────────────────┤
│ 🔗 링크 복사                │
│ 🔄 새로고침                 │
│ 🔧 개발자 도구              │
└─────────────────────────────┘
```

---

### 6. 선택 텍스트 플로팅 툴바 (선택사항)

**트리거**: webview에서 텍스트 선택 시 자동 표시

```
        ┌──────────────────────────┐
        │ [📋] [🤖] [📎] [🔗]     │
        └──────────────────────────┘
              ↑
    "선택된 텍스트가 여기에..."
```

| 아이콘 | 동작 |
|--------|------|
| 📋 | 선택 텍스트 클리핑 |
| 🤖 | 선택 텍스트 AI 처리 |
| 📎 | 현재 노트에 추가 |
| 🔗 | 링크로 복사 |

---

### 7. 통합 분석 모달 (유일한 모달 - 핵심 기능)

**트리거**:
- [🤖▼] 드롭다운에서 "분석 모달 열기" 선택
- 클리핑 수집 노트에서 분석 실행
- Command Palette: `Note Gate: Open Analysis`

**핵심 설계 원칙**:
- 1개 문서든 N개 문서든 **동일한 모달**에서 처리
- **모든 옵션은 선택사항** - 기본값으로 바로 실행 가능
- API 키는 한 번 저장 후 유지, **Provider만 드롭다운 선택**

```
┌─────────────────────────────────────────────────────┐
│  🤖 AI 분석                                   [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📎 분석 대상                                        │
│  ┌───────────────────────────────────────────────┐  │
│  │ ☑️ 현재 페이지: TechCrunch - AI 발표 (2,341자)│  │
│  │ ☑️ 클리핑 1: Google Gemini 업데이트 (1,892자) │  │
│  │ ☐ 클리핑 2: X.com AI 토론 (567자)            │  │
│  │                                               │  │
│  │ [+ 클리핑 추가]                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  🤖 AI Provider                                     │
│  [Gemini ▼] gemini-2.5-flash                       │
│  ※ API 키는 설정에서 한 번만 입력                    │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📝 작업 방식 (택1, 모두 선택 안 하면 기본 요약)      │
│                                                     │
│  ○ 기본 템플릿 사용                                 │
│     [📝 요약 ▼]  📚학습노트 / 📊분석 / 💡아이디어   │
│                                                     │
│  ○ 커스텀 프롬프트 입력                             │
│     ┌───────────────────────────────────────────┐  │
│     │ 각 회사의 AI 전략 차이점을 비교 분석하고   │  │
│     │ 향후 전망을 예측해줘                       │  │
│     └───────────────────────────────────────────┘  │
│                                                     │
│  ○ 내 템플릿 파일 사용                              │
│     📁 [/templates/my-analysis.md        ] [찾기]  │
│     ※ 마크다운 파일 경로 입력                       │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📁 결과 저장 위치                                   │
│  ● 새 노트 생성: [Clippings/분석결과     ▼]        │
│  ○ 기존 노트에 추가: [노트 선택...       ▼]        │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  📊 예상: ~4,233자 입력 / ~2,100 토큰               │
│                                                     │
│  [취소]                         [🤖 분석 시작]      │
└─────────────────────────────────────────────────────┘
```

**Provider 드롭다운 동작**:
```
[Gemini ▼]
├─ ✅ Gemini (gemini-2.5-flash)      ← API 키 설정됨
├─    Grok (grok-4-1-fast)           ← API 키 미설정 (회색)
├─    Claude (claude-sonnet-4.5)     ← API 키 미설정
├─ ✅ OpenAI (gpt-5)                  ← API 키 설정됨
├─    GLM (glm-4.6)                  ← API 키 미설정
├─────────────────────────
└─ ⚙️ API 키 설정...
```

**사용자 템플릿 파일 예시** (`/templates/my-analysis.md`):
```markdown
# {{title}}

## 요약
{{ai:이 문서의 핵심 내용을 3문장으로 요약}}

## 주요 인사이트
{{ai:가장 중요한 인사이트 3가지}}

## 액션 아이템
{{ai:이 내용을 바탕으로 실행할 수 있는 액션 아이템}}

## 관련 키워드
{{ai:관련 키워드 5개를 태그 형식으로}}

---
출처: {{source}}
분석일: {{date}}
```

**노트 내 클리핑 수집 형식**:
~~~markdown
# AI 트렌드 리서치

## 수집된 클리핑

```gate-clip
source: https://techcrunch.com/ai-article
title: OpenAI 발표
clipped: 2025-12-18
content: |
  OpenAI가 새로운 모델을 발표했다...
```

```gate-clip
source: https://blog.google/ai
title: Google Gemini 업데이트
clipped: 2025-12-18
content: |
  Google이 Gemini를 업데이트했다...
```

## 분석 결과
<!-- AI 분석 결과가 여기에 생성됨 -->
~~~

---

### 8. Process 모달 (AI 작업 진행 상태)

**트리거**: AI 분석 실행 시 자동 표시

```
┌─────────────────────────────────────────────────────┐
│  🤖 AI 분석 중...                              [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📊 진행 상태                                        │
│                                                     │
│  ████████████████████░░░░░░░░░░░  65%               │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  📝 현재 작업                                        │
│  ✅ 콘텐츠 추출 완료 (2개 문서)                       │
│  ✅ 프롬프트 생성 완료                               │
│  🔄 AI 응답 대기 중... (Gemini)                      │
│  ⏳ 노트 생성 대기                                   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  ⏱️ 예상 소요시간: ~15초                             │
│  📊 입력 토큰: 4,233 | Provider: Gemini             │
│                                                     │
│  [취소]                                             │
└─────────────────────────────────────────────────────┘
```

**완료 시 자동 변환**:

```
┌─────────────────────────────────────────────────────┐
│  ✅ AI 분석 완료!                              [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  📄 생성된 노트                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ AI 트렌드 종합 분석.md                        │  │
│  │ 📁 Clippings/분석결과                          │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  📊 처리 결과                                        │
│  • 입력: 4,233자 (2개 문서)                          │
│  • 출력: 1,892자                                    │
│  • 소요시간: 12.3초                                  │
│  • 토큰 사용: 약 2,100                               │
│                                                     │
│  [닫기]                           [📄 노트 열기]     │
└─────────────────────────────────────────────────────┘
```

**에러 발생 시**:

```
┌─────────────────────────────────────────────────────┐
│  ❌ AI 분석 실패                               [X]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ⚠️ 오류 내용                                        │
│  API 요청 시간 초과 (30초)                           │
│                                                     │
│  💡 해결 방법                                        │
│  • 네트워크 연결을 확인하세요                         │
│  • API 키가 유효한지 설정에서 확인하세요              │
│  • 입력 텍스트가 너무 길 수 있습니다                  │
│                                                     │
│  [닫기]                           [🔄 다시 시도]     │
└─────────────────────────────────────────────────────┘
```

---

### 9. Command Palette 통합

**Ctrl+P로 접근 가능한 명령어**:

```
> Note Gate: Quick Clip (현재 페이지)
> Note Gate: Quick Clip to... (노트 선택)
> Note Gate: AI Summary
> Note Gate: AI with Custom Prompt
> Note Gate: Analyze Multi-Source Note
> Note Gate: Open AI Settings
```

---

### UI 비교: Before vs After

| 작업 | Before (7개 모달) | After (2개 모달) |
|------|-------------------|------------------|
| 기본 클리핑 | 클릭→모달→옵션→실행 (4단계) | 클릭 (1단계) |
| AI 요약 | 클릭→메뉴모달→템플릿모달 (3단계) | 클릭 또는 드롭다운 (1-2단계) |
| 옵션 변경 | 모달 열기 | 드롭다운 (화면 유지) |
| 커스텀 프롬프트 | 별도 모달 | 인라인 입력 또는 분석 모달 |
| 진행 상태 | 별도 모달 | **Process 모달** (필수 유지) |
| 분석 (1~N개) | 별도 모달 2개 | **Analysis 모달** 1개로 통합 |

**모달 구성 요약**:
1. **AnalysisModal** - 통합 분석 (1개~N개 문서, 모든 설정 통합)
2. **ProcessModal** - AI 작업 진행 상태 표시 (필수)

---

### 8. Settings Tab (AI 설정)

**위치**: Obsidian 설정 > Note Gate > AI Settings

**핵심 설계**:
- API 키는 **한 번만 설정** → 이후 Provider 드롭다운에서 선택만
- 각 Provider별로 독립적인 API 키 관리
- 키가 설정된 Provider만 드롭다운에서 활성화 표시

```
┌─────────────────────────────────────────────────────────────────┐
│  Note Gate Settings                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔑 AI API 키 관리 (한 번 설정하면 유지됩니다)                   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Provider       │ API Key              │ 모델          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ ✅ Gemini      │ [••••••••••••] [Test]│ gemini-2.5-flash│   │
│  │ ✅ OpenAI      │ [••••••••••••] [Test]│ gpt-5          │   │
│  │ ⬜ Grok        │ [설정 안 됨   ] [입력]│ grok-4-1-fast  │   │
│  │ ⬜ Claude      │ [설정 안 됨   ] [입력]│ claude-sonnet-4.5│   │
│  │ ⬜ GLM (Zhipu) │ [설정 안 됨   ] [입력]│ glm-4.6        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ※ 기본 Provider (API 키 설정된 것 중 선택)                      │
│  [Gemini                                                  ▼]    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚙️ 커스텀 모델 설정 (선택사항)                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ☐ 커스텀 모델명 사용                                            │
│     Provider: [Gemini ▼]                                        │
│     모델명:   [gemini-2.5-pro                            ]      │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  📋 클리핑 기본 설정                                             │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  기본 저장 폴더                                                  │
│  [Clippings                                               ▼]    │
│                                                                 │
│  파일명 형식                                                     │
│  [{title} - {date}                                        ]     │
│                                                                 │
│  메타데이터 포함                                                 │
│  ☑️ URL     ☑️ 날짜     ☑️ 작성자     ☐ HTML 원본               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ✨ AI 생성 설정                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  기본 언어                                                       │
│  [한국어                                                  ▼]    │
│                                                                 │
│  기본 템플릿                                                     │
│  [📋 기본 요약                                            ▼]    │
│                                                                 │
│  자동 태그 생성                                                  │
│  [켜짐                                                    ▼]    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  💾 저장된 프롬프트 관리                                         │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [번역] 한국어로 번역해줘                              [편집] [X] │
│  [요약] 3문장으로 요약해줘                             [편집] [X] │
│  [비판] 이 글의 문제점을 분석해줘                      [편집] [X] │
│                                                                 │
│  [+ 새 프롬프트 추가]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**API 키 테스트 동작**:
- [Test] 클릭 시 간단한 API 호출로 키 유효성 확인
- 성공: ✅ "연결 성공" 토스트
- 실패: ❌ "API 키가 유효하지 않습니다" 토스트

---

## 📁 파일 구조

**모달 간소화**: 7개 → 2개 (통합 분석 모달 + 진행 상태 모달)

```
src/
├── main.ts                          # 메인 플러그인 (수정)
├── GateView.ts                      # Gate 뷰 (수정 - AI 버튼, 드롭다운 추가)
├── GateOptions.d.ts                 # 타입 정의 (수정)
├── SettingTab.ts                    # 설정 탭 (수정 - AI 설정 추가)
│
├── ai/                              # 🆕 AI 기능 모듈
│   ├── AIService.ts                 # AI 프로바이더 추상화 레이어
│   ├── providers/
│   │   ├── GeminiProvider.ts        # Google Gemini API
│   │   ├── GrokProvider.ts          # xAI Grok API
│   │   ├── ClaudeProvider.ts        # Anthropic Claude API
│   │   ├── OpenAIProvider.ts        # OpenAI API
│   │   └── GLMProvider.ts           # Zhipu GLM API
│   ├── templates/
│   │   ├── TemplateManager.ts       # 템플릿 관리 (플러그인 + 사용자 템플릿)
│   │   ├── BasicSummary.ts          # 기본 요약 템플릿
│   │   ├── StudyNote.ts             # 학습 노트 템플릿
│   │   ├── AnalysisReport.ts        # 분석 리포트 템플릿
│   │   └── IdeaNote.ts              # 아이디어 노트 템플릿
│   ├── prompts/
│   │   ├── PromptBuilder.ts         # 프롬프트 생성기
│   │   └── SystemPrompts.ts         # 시스템 프롬프트 상수
│   └── UserTemplateParser.ts        # 🆕 사용자 템플릿 파서 ({{ai:...}} 처리)
│
├── clipping/                        # 🆕 웹 클리핑 모듈
│   ├── ClipService.ts               # 클리핑 서비스
│   ├── ContentExtractor.ts          # 콘텐츠 추출기
│   ├── MetadataParser.ts            # 메타데이터 파서
│   ├── NoteGenerator.ts             # 노트 생성기
│   └── GateClipParser.ts            # 🆕 gate-clip 코드블록 파서
│
├── modals/                          # 🆕 모달 컴포넌트 (2개로 간소화!)
│   ├── AnalysisModal.ts             # 통합 분석 모달 (1~N개 문서)
│   └── ProcessModal.ts              # AI 작업 진행 상태 모달
│
├── ui/                              # 🆕 UI 컴포넌트 (모달 대신 인라인)
│   ├── ClipDropdown.ts              # 클립 버튼 드롭다운
│   ├── AIDropdown.ts                # AI 버튼 드롭다운
│   ├── ContextMenu.ts               # 우클릭 컨텍스트 메뉴
│   ├── FloatingToolbar.ts           # 선택 텍스트 플로팅 툴바 (선택)
│   ├── InlineProgress.ts            # 인라인 진행률 표시
│   └── ToastNotification.ts         # 토스트 알림
│
└── fns/                             # 기존 유틸리티 (유지)
    ├── createWebviewTag.ts
    ├── createIframe.ts
    └── ...
```

---

## 🔧 데이터 구조

### PluginSettings 확장

```typescript
interface PluginSettings {
    uuid: string;
    gates: Record<string, GateFrameOption>;

    // 🆕 AI 설정
    ai: {
        provider: 'gemini' | 'grok' | 'claude' | 'openai' | 'glm';
        apiKeys: {
            gemini?: string;
            grok?: string;
            claude?: string;
            openai?: string;
            glm?: string;
        };
        models: {
            gemini: string;      // default: 'gemini-2.5-flash'
            grok: string;        // default: 'grok-4-1-fast'
            claude: string;      // default: 'claude-sonnet-4-5-20241022'
            openai: string;      // default: 'gpt-5'
            glm: string;         // default: 'glm-4.6'
        };
        useCustomModel: boolean;
        customModel: string;
        defaultLanguage: string;  // default: '한국어'
        defaultTemplate: string;  // default: 'basic-summary'
        autoTags: boolean;        // default: true
    };

    // 🆕 클리핑 설정
    clipping: {
        defaultFolder: string;    // default: 'Clippings'
        filenameFormat: string;   // default: '{title} - {date}'
        includeUrl: boolean;      // default: true
        includeDate: boolean;     // default: true
        includeAuthor: boolean;   // default: true
        includeHtml: boolean;     // default: false
    };

    // 🆕 저장된 프롬프트
    savedPrompts: {
        id: string;
        name: string;
        prompt: string;
    }[];
}
```

### ClipData 구조

```typescript
interface ClipData {
    id: string;
    url: string;
    title: string;
    content: string;           // 추출된 텍스트
    html?: string;             // 원본 HTML (선택)
    metadata: {
        author?: string;
        date?: string;
        siteName?: string;
        description?: string;
        image?: string;
    };
    clippedAt: string;         // ISO timestamp
    gateId: string;            // 클리핑한 Gate ID
}
```

### AIRequest 구조

```typescript
interface AIRequest {
    clips: ClipData[];         // 분석할 클리핑들
    template: string;          // 템플릿 ID
    customPrompt?: string;     // 커스텀 프롬프트 (선택)
    additionalInstructions?: string;  // 추가 지시사항
    outputFormat: 'markdown' | 'plain';
    language: string;
}

interface AIResponse {
    success: boolean;
    content: string;           // 생성된 노트 내용
    metadata: {
        tokensUsed: number;
        processingTime: number;
        model: string;
        provider: string;
    };
    suggestedTags?: string[];
    suggestedTitle?: string;
    error?: string;
}
```

---

## 📋 노트 템플릿

### 1. 기본 요약 (basic-summary)

```markdown
---
source: {url}
clipped: {date}
tags: {auto-generated-tags}
---

# {title}

## 📋 요약
{ai-generated-summary}

## 🎯 핵심 포인트
{ai-generated-key-points}

## 💡 인사이트
{ai-generated-insights}

---
*클리핑: {source-title} | {clipped-date}*
```

### 2. 학습 노트 (study-note)

```markdown
---
source: {url}
clipped: {date}
type: study-note
tags: {auto-generated-tags}
---

# 📚 {title}

## 🎯 학습 목표
{ai-generated-objectives}

## 📖 핵심 개념
{ai-generated-concepts}

## ❓ Q&A
{ai-generated-qa}

## ✅ 복습 체크리스트
- [ ] 핵심 개념 이해
- [ ] 예제 문제 풀기
- [ ] 다른 자료와 연결

## 🔗 연관 주제
{ai-generated-related-topics}

---
*클리핑: {source-title} | {clipped-date}*
```

### 3. 분석 리포트 (analysis-report)

```markdown
---
source: {url}
clipped: {date}
type: analysis
tags: {auto-generated-tags}
---

# 📊 {title} - 분석 리포트

## 📌 배경
{ai-generated-background}

## 🔍 핵심 분석
{ai-generated-analysis}

## 💡 시사점
{ai-generated-implications}

## 🎯 액션 아이템
{ai-generated-action-items}

## ⚠️ 주의사항 / 한계
{ai-generated-limitations}

---
*클리핑: {source-title} | {clipped-date}*
```

### 4. 아이디어 노트 (idea-note)

```markdown
---
source: {url}
clipped: {date}
type: idea
tags: {auto-generated-tags}
---

# 💡 {title}

## ✨ 핵심 영감
{ai-generated-inspiration}

## 🚀 적용 방안
{ai-generated-applications}

## 🔗 연관 아이디어
{ai-generated-related-ideas}

## 📝 메모
{user-notes}

---
*클리핑: {source-title} | {clipped-date}*
```

### 5. 멀티소스 종합 (multi-source)

```markdown
---
sources:
  - {url1}
  - {url2}
  - {url3}
analyzed: {date}
type: multi-source-analysis
tags: {auto-generated-tags}
---

# 📚 종합 분석: {topic}

## 📎 분석 소스
| # | 출처 | 제목 |
|---|------|------|
| 1 | {source1} | {title1} |
| 2 | {source2} | {title2} |
| 3 | {source3} | {title3} |

## 📋 종합 요약
{ai-generated-overall-summary}

## 🔄 공통점
{ai-generated-commonalities}

## ⚡ 차이점
{ai-generated-differences}

## 💡 종합 인사이트
{ai-generated-insights}

## 🎯 결론 및 제안
{ai-generated-conclusions}

---
*종합 분석: {analyzed-date}*
```

---

## 🔄 개발 단계

### Phase 1: 기반 구축 (1주)
- [ ] AI 프로바이더 추상화 레이어 구현 (`AIService.ts`)
- [ ] 5개 AI 프로바이더 연동 (Gemini, Grok, Claude, OpenAI, GLM)
- [ ] 설정 탭 UI 구현 - Provider별 API 키 테이블
- [ ] API 키 검증 기능 (Test 버튼)
- [ ] Provider 드롭다운 로직 (키 설정된 것만 활성화)

### Phase 2: 웹 클리핑 + 인라인 UI (1주)
- [ ] 콘텐츠 추출기 구현 (`webview.executeJavaScript`)
- [ ] 메타데이터 파서 구현
- [ ] 노트 생성기 구현
- [ ] Gate Top Bar에 스마트 버튼 추가 (📋, 🤖)
- [ ] **ClipDropdown.ts** - 클립 옵션 드롭다운
- [ ] **AIDropdown.ts** - AI 액션 드롭다운
- [ ] **InlineProgress.ts** - 버튼 내 진행률 표시
- [ ] **ToastNotification.ts** - 완료 알림

### Phase 3: 통합 분석 시스템 (1주)
- [ ] 템플릿 시스템 구현 (5개 기본 템플릿)
- [ ] **UserTemplateParser.ts** - `{{ai:...}}` 문법 파서
- [ ] 프롬프트 빌더 구현
- [ ] **AnalysisModal.ts** - 통합 분석 모달 (1~N개 문서)
- [ ] **ProcessModal.ts** - AI 작업 진행 상태 모달
- [ ] `gate-clip` 코드블록 파서

### Phase 4: 컨텍스트 메뉴 + 고급 기능 (1주)
- [ ] **ContextMenu.ts** - 우클릭 메뉴
- [ ] **FloatingToolbar.ts** - 선택 텍스트 플로팅 툴바 (선택)
- [ ] Command Palette 명령어 등록
- [ ] 저장된 프롬프트 관리 (설정 탭)
- [ ] 커스텀 모델명 지원

### Phase 5: 테스트 및 최적화 (1주)
- [ ] 각 AI 프로바이더 테스트
- [ ] 에러 핸들링 강화 (타임아웃, 재시도)
- [ ] 대용량 텍스트 청킹 처리
- [ ] 성능 최적화
- [ ] UX 피드백 반영

---

## ⚠️ 고려사항

### 보안
- API 키는 Obsidian의 `saveData`로 암호화 저장
- 민감한 데이터는 로컬에서만 처리
- HTTPS 통신 필수

### 비용
- 각 AI 프로바이더의 토큰 비용 명시
- 예상 비용 표시 기능 (선택)
- 일일/월간 사용량 제한 옵션

### 성능
- 대용량 텍스트 청킹 처리
- 요청 타임아웃 설정 (30초)
- 실패 시 재시도 로직 (최대 3회)

### 호환성
- 모바일에서는 AI 기능 비활성화 (API 키 보안 문제)
- Obsidian 최소 버전: 0.15.0

---

## 📝 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2025-12-18 | 초안 작성 |
| 1.1 | 2025-12-18 | UX 간소화 (7개 모달 → 2개 모달 + 드롭다운) |
| 1.2 | 2025-12-18 | 통합 분석 기능 (1개~N개 문서 통합), API 키 관리 개선 |
| 1.3 | 2025-12-18 | Process 모달 추가, 사용자 템플릿 `{{ai:...}}` 문법 정의 |

---

## 🔗 참고 자료

- [Obsidian Plugin API](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- [Google Gemini API](https://ai.google.dev/docs)
- [xAI Grok API](https://docs.x.ai/api)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference)
- [OpenAI API](https://platform.openai.com/docs)
- [Zhipu GLM API](https://open.bigmodel.cn/dev/api)
