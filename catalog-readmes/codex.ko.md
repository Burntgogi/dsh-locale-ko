---
description: "The one-shot Codex subagent provider for users and maintainers choosing a product backend, installing a Profile bundle, or configuring an unattended Codex delegation."
kind: "package-bundle"
---

# @deepseek-ai/dsh-subagent-codex

한국어 | [中文](README.zh.md)

## 개요

위임한 작업을 부모 세션의 작업공간에서 실제 무인 Codex 세션으로 실행하려면 프로필에 `@deepseek-ai/dsh-subagent-codex`를 설치하세요. 각 위임은 독립적인 텍스트 작업 하나에 새로 격리된 Codex 스레드를 사용하며, 선택된 답변 또는 안전한 실패 진단만 반환합니다. Codex 자체 설정과 인증이 우선하며 `permissionMode`로 비대화형 승인 및 샌드박스 동작을 선택합니다. 번들은 호환되는 Codex 자체 실행 파일을 제공하고 위임 도구를 전역 도구로 추가합니다.

## 목차

- [이 패키지 사용](#use-this-package)
- [구현 이해하기](#understand-the-implementation)
- [더 알아보기](#further-exploration)
- [모델 경험](#model-experience)
- [알려진 제한과 미뤄진 작업](#known-limitations-and-deferred-work)
- [개발 참고](#dev-note)

-----

<a id="use-this-package"></a>
## 이 패키지 사용

부모 작업공간에서 새로운 Codex 자체 세션이 필요한 작업을 할 때 웹 또는 데스크톱 플러그인 페이지에서 **Codex 서브에이전트**를 활성화하세요.

### 번들 설치

공식 항목은 오프라인에서도 표시됩니다. 활성화하면 일반 번들 설치 프로그램을 통해 [실행 중인 DSH 설치의 대상](../../boot/plugin-manager/README.md#use-this-package)을 설치하고 해당 프로필 계층을 선택합니다. 이 계층은 제공자를 등록하고 `subagent_codex`를 모든 에이전트의 전역 도구로 추가합니다. 위임하기 전까지 Codex 자체 프로세스는 시작하지 않습니다. 설치 프로그램에서 다시 시작이 필요하다고 알리면 다시 시작하세요.

끄면 계층 선택이 해제되고 패키지는 설치된 상태로 남습니다. 제거는 별도의 패키지 작업입니다. 활성화하거나 끄면 실행 중인 호스트에 전역 도구가 등록되거나 제거되므로 활성 에이전트는 다음 요청부터 변경 사항을 볼 수 있습니다.

이 계층은 호스트 행만 삽입하므로 제공되는 headless, SDK, ACP 프로필을 포함한 모든 프로필에서 선택할 수 있습니다. 기존 제공자 전용 사용자는 [업그레이드 가이드](../../../docs/upgrade-guide/v0.2.1-alpha.1/native-subagent-bundle-tools/guide.md)를 따르세요.

### 설정

| 필드 | 기본값 | 의미 |
|---|---|---|
| `providerName` | `codex` | `ctx.subagents`의 비어 있지 않은 레지스트리 이름. 마운트된 인스턴스마다 고유해야 함 |
| `model` | Codex 자체 설정 | 이 제공자 인스턴스의 모든 스레드에 고정되는 선택적이고 비어 있지 않은 모델 이름. 생략하면 app-server 재정의 값을 보내지 않음 |
| `env` | `{}` | 자격 증명 관련 변수를 제거한 부모 환경 위에 적용하는 명시적 자식 환경 |
| `permissionMode` | `never` | 이 제공자 인스턴스의 모든 스레드에 고정되는 Codex 자체 비대화형 승인 및 샌드박스 모드 |
| `disposeGraceMs` | `3000` | 공유 관리 범위 소유자의 종료 단계 사이 유예 시간 |

| `permissionMode` 값 | `thread/start` 필드 | Codex 자체 동작 |
|---|---|---|
| `never` | `approvalPolicy: never`; sandbox omitted | 승인을 요청하지 않으며 Codex 자체 샌드박스에서 발생한 실행 실패를 모델에 반환 |
| `approve-for-me` | `approvalPolicy: on-request`, `approvalsReviewer: auto_review`, `sandbox: workspace-write` | 사람 없이 Codex 자동 검토를 통해 권한 요청을 처리 |
| `dangerously-bypass-approvals-and-sandbox` | `approvalPolicy: never`, `sandbox: danger-full-access` | 승인과 샌드박스 적용을 건너뜀. 이 값은 명시적으로 선택해야 함 |

생성된 [설정 카탈로그](../../../docs/config-catalog.md#deepseek-aidsh-subagent-codex)에 허용되는 모든 필드와 JSDoc이 빠짐없이 나와 있습니다. 설정된 `model`은 각 임시 `thread/start`에 그대로 전달되며 생략하면 기본 모델 선택이 적용됩니다. 제공자는 모델을 검색하거나 별칭을 바꾸거나 `modelProvider` 또는 `serviceTier`를 선택하거나 대체 값을 설정하지 않습니다. 명시적 `env`를 적용하기 전에 자격 증명 형태의 주변 환경 변수를 제거하므로 자식에 필요한 API 키는 여기에 제공해야 합니다.

<a id="exposing-the-tool"></a>
### 도구 노출

번들은 `tool-subagent-codex`를 호스트 행으로 삽입하므로 `subagent_codex`는 minimal을 포함한 모든 프리셋에서 보이는 전역 도구입니다. 이후 사용자 패치에서 ID로 해당 행을 설정하거나 비활성화할 수 있습니다. 같은 이름의 자체 도구를 등록하는 프리셋에서는 해당 에이전트에 전역 도구 대신 자체 도구가 적용됩니다. 번들 계층을 선택하지 않고 제공자와 도구를 마운트하려면 `cordis.patch.yml`에 같은 행을 삽입하세요.

```yaml
- insert:
    - id: subagent-codex
      name: '@deepseek-ai/dsh-subagent-codex'
    - id: tool-subagent-codex
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: codex
        toolName: subagent_codex
        maxDepth: provider-managed
```

도구는 작업을 수락한 후 자식 ID를 반환하고 완료되면 부모 에이전트에 결과를 보냅니다. 각 외부 실행은 한 번만 실행되며 후속 입력이나 재개를 허용하지 않습니다.

### 제공되는 결과

완료 알림에는 선택된 Codex 답변 또는 중지 이유와 선택적인 안전 진단이 포함됩니다. 부모 세션은 알림과 별도로 외부 작업 ID와 완전한 종료 결과도 보관합니다. 로컬 자식 세션은 생성되지 않습니다. 제품의 추론, 도구 활동, 원시 stderr와 작업공간 diff는 부모 세션에 들어가지 않습니다.

### 실패와 복구

선택적 의존성을 생략해 설치했거나, 지원하지 않는 플랫폼을 사용하거나, 선택된 실행 파일이 없어지면 제공자는 비활성 상태로 남고 첫 위임이 `initialize`에서 안전한 `unknown` 범주와 관찰된 프로세스 결과가 있다면 그 결과를 반환하며 실패합니다. 호스트 CLI로 대체하지 않습니다. 원시 래퍼 텍스트는 호스트 stderr에 남습니다. 취소된 실행은 `aborted`로 종료됩니다.

-----

<a id="understand-the-implementation"></a>
## 구현 이해하기

<details>
<summary>구현 내부 — 클릭하여 펼치기</summary>

이 절은 제공자가 실제 Codex app-server를 구동하는 방식과 관찰 가능한 동작의 출처를 설명합니다. 전체 계약은 [이 패키지 사용](#use-this-package)에 있습니다.

### 설계 개념

- **실행마다 새 프로세스, 스레드, 턴 하나.** 실행할 때마다 새 app-server를 시작하고 임시 스레드 하나를 만들어 정확히 한 턴을 실행합니다. 이어가기, 재개 또는 풀링은 없습니다.
- **Codex 자체 설정이 우선합니다.** Codex 설정과 인증은 부모 cwd, `HOME`, `CODEX_HOME`을 통해 Codex 자체 방식을 따릅니다. 제공자는 선택적 모델과 스레드의 승인, 검토자, 샌드박스 필드만 재정의합니다.
- **무인 실행을 전제로 합니다.** 승인, 사용자 입력 및 MCP 요청은 사람 없이 응답하거나 거절하며 알 수 없는 서버 요청은 실행을 실패시킵니다.

### 소스 맵

| 파일 | 역할 |
|---|---|
| [`src/index.ts`](src/index.ts) | 플러그인 진입점: 설정 스키마, 제공자 등록 |
| [`src/run.ts`](src/run.ts) | 실행 수명 주기, 턴 실행, 결과 선택 및 진단 |
| [`src/wire.ts`](src/wire.ts) | 최소한의 app-server JSON-RPC 통신 구현 |
| [`cordis.patch.yml`](cordis.patch.yml) | 제공자를 등록하고 프리셋 위임 도구를 제공하는 프로필 계층 |

### 실행 흐름

시작은 비어 있지 않은 텍스트 블록 시퀀스만 수락하고 서브에이전트 서비스가 선택한 자식 cwd를 사용합니다. 서브프로세스 연결 지점을 통해 고정 명령을 실행하고 `initialize` → `initialized` 핸드셰이크를 수행하며 프로필에서 선택한 모드와 선택적 모델을 `{ cwd, ephemeral: true }` 옆의 공식 `thread/start` 필드에 매핑합니다. Codex가 유효한 임시 스레드를 반환한 후에만 실행을 게시합니다. 게시된 결과는 정확히 한 턴을 시작하고 해당 실행의 스레드와 턴에 대한 알림만 수락하며 최종 기준인 `turn/completed` 종료를 기다립니다. 가장 최근의 `phase: "final_answer"`인 `agentMessage`가 우선합니다. 없으면 가장 최근의 `phase: "partial_answer"` 메시지(이후 어시스턴트 출력이나 도구 호출이 뒤따를 수 있는 안정적인 답변 텍스트)를 선택합니다. Codex가 두 명시적 답변 단계 중 어느 것도 내보내지 않으면 `phase: null`인 가장 최근 메시지를 호환성 대체값으로 사용합니다. `commentary` 메시지는 선택하지 않으며 다른 단계는 실행을 실패시킵니다. 성공한 턴에 공백이 아닌 답변이 없으면 오류로 종료합니다. 실패한 턴은 대략적인 범주 `limit`, `access-policy`, `service`, `transport`, `product-error`, `invalid-result` 또는 `unknown`을 사용합니다. app-server의 조기 종료는 `process`를 사용하며 해당되는 연결 및 스트림 실패는 숫자 `httpStatusCode`를 유지합니다.

</details>

-----

<a id="further-exploration"></a>
## 더 알아보기

패키지 수준 계약만으로 충분하지 않을 때 이 페이지들을 읽어 보세요. 이 제공자에서 시작해 연결 지점과 같은 계열 제품 제공자를 살펴봅니다.

- [서브에이전트 하위 시스템](../../../docs/subsystems/subagent.md) — 서비스 계약, 제공자 계약 및 종료 결과의 의미.
- [dsh-subagent 연결 지점](../subagent/README.md) — 이 제공자가 등록하는 레지스트리와 시작 API.
- [Claude Code 서브에이전트 제공자](../subagent-claude-code/README.md) — 공식 Agent SDK를 사용하는 같은 계열 제품 백엔드.
- [과거 Claude Code 및 Codex 백엔드](../../../.agents/notes/archived/feature/2026-08-04-claude-code-and-codex-subagent-backends.md) — 제품 제공자의 설계 기록.
- [생성된 설정 카탈로그](../../../docs/config-catalog.md#deepseek-aidsh-subagent-codex) — 허용되는 모든 설정 필드와 소스 선언.

-----

<a id="model-experience"></a>
## 모델 경험

### 자식 요청

#### 모델에 보이는 것

Codex 자식은 독립적인 텍스트 블록을 새로운 임시 스레드의 한 턴으로 받습니다. 작업공간은 선택된 자식 작업 디렉터리입니다. 선택된 제공자 인스턴스가 설정된 모델, 환경, 비대화형 승인 정책 및 샌드박스 모드를 고정하며, 생략된 모델과 나머지 제품 설정은 Codex 자체 설정에서 가져옵니다. 실행 파일 버전은 번들에 고정된 플랫폼 실행 파일에서 결정됩니다.

#### 토큰 영향

자식은 독립적인 Codex 컨텍스트와 턴에 대한 토큰을 사용합니다. 자식 토큰은 부모 컨텍스트에 들어가지 않습니다.

#### KV 캐시 영향

부모 요청 캐시와 독립적입니다. 재사용은 Codex 자체 제공자, 모델, 지시, 도구 및 임시 스레드 요청에만 달려 있습니다.

### 부모 스케줄링과 결과(간접 영향)

#### 모델에 보이는 것

`dsh-tool-subagent`를 통해 부모 모델은 먼저 자식 ID를 받고, 이후 선택된 Codex 답변(우선순위는 최종, 부분, 단계 미지정 순서) 또는 중지 이유와 안전한 진단이 포함된 실패 알림을 받습니다. 진단에는 고정된 단계, 범주와 관찰된 프로토콜 또는 프로세스 사실만 포함됩니다. 제품 추론, 중간 메시지, 도구 활동, stderr, 사용량, 제품 식별자, 명령, 경로와 원시 프로토콜 페이로드는 부모 세션에 복사되지 않습니다.

#### 토큰 영향

부모 입력은 선택된 답변 또는 실패 세부 정보를 포함한 시작 확인과 완료 알림만큼 증가합니다. 자식 토큰은 부모 컨텍스트에 들어가지 않습니다. 이 제공자 자체는 부모 도구 스키마를 추가하지 않습니다.

#### KV 캐시 영향

시작 확인과 완료 알림은 재사용 가능한 부모 요청 접두부 뒤에 추가됩니다. 알림은 기존 접두부를 다시 쓰지 않고 다른 턴을 깨울 수 있습니다.

## 알려진 제한과 미뤄진 작업

<a id="known-limitations-and-deferred-work"></a>

이 제한은 이 제공자가 적합하지 않거나 운영에 특별한 주의가 필요한 경우를 정의합니다. 현재 패키지의 제약이며 일반적인 Codex 비교나 작업 목록이 아닙니다.

- **실행마다 새 프로세스, 스레드와 턴 하나** — 이어가기, 재개, 풀링, 진행 스트림 또는 제품 세션 영속성이 없습니다.
- **정적 인스턴스 선택** — 프로필 행이 제공자 이름, 선택적 모델 및 도구 바인딩을 고정합니다. 호출에서 제공자나 모델을 동적으로 선택하거나 변경할 수 없으며 노출된 도구마다 고유한 `toolName`이 필요합니다.
- **인증과 계정 상태는 Codex 자체 설정을 따름** — 번들은 CLI를 제공하지만 계정을 만들거나 로그인하거나 프로젝트를 신뢰하거나 Codex 설정을 다시 쓰지 않습니다. 설정과 인증 실패는 별도의 공개 분류 대신 수명 주기 단계와 안전한 `unknown` 대체값으로 표시됩니다.
- **위임 시 플랫폼 네이티브 실행 파일 필요** — 선택적 의존성을 생략한 설치, 지원하지 않는 플랫폼, 없거나 손상된 실행 파일은 첫 실행에서 실패합니다. 호스트 CLI로 대체하지 않습니다.
- **개발 근거에 따른 호환성 고정** — 검증된 0.153.4 프로토콜 기준에서 업그레이드하려면 업스트림 스키마 근거를 다시 생성하고 핸드셰이크, 답변 선택, 승인, 취소, 키 없는 실제 제품 및 자격 증명을 사용하는 DeepSeek nonce 테스트를 다시 실행해야 합니다.
- **사람의 승인 경로 없음** — 알려진 무인 승인 요청은 거부하고 알 수 없는 서버 요청은 안전하게 실패합니다. 세 프로필 모드 중 어느 것도 DSH 상호작용 채널이나 호출별 허용 정책을 만들지 않습니다.
- **어시스턴트 페이로드는 선택된 답변 텍스트뿐** — 실패한 실행은 별도의 안전 진단도 표시할 수 있습니다. 추론, 중간 메시지, 도구 통신, 사용량, stderr와 작업공간 diff는 부모 세션에 들어가지 않습니다. 작업 ID와 종료 결과는 부모 로그에 보관됩니다.
- **선택적 공유 기능 없음** — 공유 서비스가 이 제공자에 대해 `agentPreset`, `agentOptions`, 출력 스키마 및 하네스 깊이 적용을 거부합니다.
- **실제 경과 시간 제한이나 부작용 롤백 없음** — 오래 걸리는 작업은 호출자가 취소하며, 취소 전에 변경된 파일이나 외부 시스템은 복원되지 않습니다.

<a id="dev-note"></a>
### 개발 참고

<details>
<summary>유지관리자를 위한 작업 맥락 — 클릭하여 펼치기</summary>

이 개발 참고는 유지관리자를 위한 작업 맥락으로, 열린 질문과 결정되지 않은 방향을 담습니다. 명시적으로 기준 문서가 아니며 제공되는 동작과 제한은 위 절과 패키지 코드에 있습니다.

- **실행 파일 크기 공개** — 현재 darwin-arm64 플랫폼 실행 파일은 압축 시 약 114 MB, 압축 해제 시 약 282 MB입니다. 이는 공개 수치이며 설치 기준이 아닙니다.
- **버전 고정 프로토콜** — 런타임 의존성은 `@openai/codex@0.153.4`에 고정되어 있습니다. 업그레이드하려면 업스트림 스키마 근거를 다시 생성하고 자격 증명을 사용하는 nonce 테스트를 다시 실행해야 합니다.

</details>
