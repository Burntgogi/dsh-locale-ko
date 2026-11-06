---
description: "The one-shot Claude Code subagent provider for users and maintainers choosing a product backend, installing a Profile bundle, or configuring an unattended Claude Code delegation."
kind: "package-bundle"
---

# @deepseek-ai/dsh-subagent-claude-code

한국어 | [中文](README.zh.md)

## 개요

위임된 작업을 부모 작업공간의 새로운 무인 Claude Code 세션에서 실행하려면 이 프로필 Bundle을 설치하세요. 각 실행은 독립적인 텍스트 작업 하나를 받아 최종 답변 또는 안전한 실패 진단을 반환합니다. 추론, 도구 통신, stderr, 사용량, 작업공간 diff는 부모 Session에 전달되지 않습니다. Claude 네이티브 설정과 인증이 우선하며, 프로필 구성에서 모델, 환경, `permissionMode`를 선택합니다. 플랫폼에 맞춰 버전이 고정된 런타임은 필요할 때 시작하며 호스트의 `claude` 실행 파일로 대체되지 않습니다. 이어서 실행하거나 질문하는 것보다 격리와 실제 Claude Code 동작이 중요할 때 선택하세요.

## 목차

- [이 패키지 사용하기](#use-this-package)
- [구현 이해하기](#understand-the-implementation)
- [더 알아보기](#further-exploration)
- [모델 경험](#model-experience)
- [알려진 제한 사항과 미뤄진 작업](#known-limitations-and-deferred-work)
- [개발 참고](#dev-note)

-----

<a id="use-this-package"></a>
## 이 패키지 사용하기

부모 작업공간에서 새로운 네이티브 Claude Code 세션이 필요한 작업에는 웹 또는 데스크톱의 플러그인 페이지에서 **Claude Code 서브에이전트**를 활성화하세요.

### 번들 설치

공식 항목은 오프라인에서도 표시됩니다. 활성화하면 일반 번들 설치 프로그램을 통해 [실행 중인 DSH 설치에 맞는 대상](../../boot/plugin-manager/README.md#use-this-package)을 설치하고 해당 프로필 계층를 선택합니다. 이 계층는 제공자를 등록하고 모든 Agent에 `subagent_claude_code`를 전역 도구로 추가합니다. 위임하기 전에는 네이티브 프로세스를 시작하지 않습니다. 설치 프로그램에서 다시 시작이 필요하다고 알리면 다시 시작하세요.

끄면 계층 선택이 해제되고 패키지는 설치된 상태로 남습니다. 제거는 별도의 패키지 작업입니다. 켜거나 끄면 실행 중인 Host에서 전역 도구가 등록되거나 제거되므로, 실행 중인 Agent는 다음 요청부터 변경 사항을 확인합니다.

이 계층는 호스트 행만 삽입하므로 제공되는 headless, SDK, ACP 프로필을 포함해 모든 프로필에서 선택할 수 있습니다. 기존에 제공자만 사용하는 경우에는 [업그레이드 가이드](../../../docs/upgrade-guide/v0.2.1-alpha.1/native-subagent-bundle-tools/guide.md)를 따르세요.

### 설정

| 필드 | 기본값 | 의미 |
|---|---|---|
| `providerName` | `claude-code` | `ctx.subagents`의 비어 있지 않은 레지스트리 이름. 마운트된 각 인스턴스는 고유한 값이 필요함 |
| `model` | Claude 네이티브 설정 | 이 제공자 인스턴스의 모든 실행에 고정되는 선택적인 비어 있지 않은 모델 이름. 생략하면 SDK 재정의 값을 보내지 않음 |
| `env` | `{}` | 자격 증명을 제거한 부모 환경에 덧씌울 명시적인 SDK/CLI 환경 |
| `permissionMode` | `dontAsk` | 이 제공자 인스턴스의 모든 실행에 고정되는 네이티브 비대화형 권한 정책 |
| `disposeGraceMs` | `3000` | 공유 관리 범위 소유자의 종료 단계 사이의 유예 시간 |

| `permissionMode` 값 | 네이티브 동작 |
|---|---|
| `dontAsk` | 아직 승인되지 않은 작업은 묻지 않고 거부 |
| `acceptEdits` | 파일 편집을 허용하고, 나머지 권한 요청은 무인 콜백에서 거부 |
| `auto` | Claude Code의 네이티브 분류기가 권한 요청을 허용하거나 거부 |
| `plan` | 네이티브 계획 모드로 실행하고 실행 승인을 거부하며 완성된 계획을 최종 답변으로 반환 |
| `bypassPermissions` | SDK의 위험한 확인 옵션을 명시적으로 설정하고 권한 검사를 우회 |

생성된 [설정 카탈로그](../../../docs/config-catalog.md#deepseek-aidsh-subagent-claude-code)는 허용되는 모든 필드와 JSDoc을 빠짐없이 설명합니다. 설정된 `model`은 해당 제공자 인스턴스의 모든 쿼리에 그대로 전달되며, 생략하면 네이티브 모델 선택이 적용됩니다. 자격 증명 형태의 환경 변수는 명시적인 `env`를 덧씌우기 전에 제거되므로, 자식 프로세스에 사용할 API 키는 `env`에 지정해야 합니다. 제공자는 SDK의 `settingSources` 옵션을 생략하므로 Claude Code는 선택된 자식 작업 디렉터리를 기준으로 호스트의 일반적인 사용자, 프로젝트 및 로컬 설정을 읽습니다. 제공자는 해당 파일을 복사하거나 필터링하지 않고, 로그인 상태를 생성하거나 수정하지 않으며, `PATH`를 검사하거나 호스트의 `claude` 실행 파일로 대체하지 않습니다.

<a id="exposing-the-tool"></a>
### 도구 노출

Bundle은 `tool-subagent-claude-code`를 호스트 행으로 삽입하므로 `subagent_claude_code`는 minimal을 포함한 모든 프리셋에 표시되는 전역 도구입니다. 이후 사용자 패치에서 해당 행의 ID로 설정하거나 비활성화할 수 있습니다. 같은 이름의 도구를 자체 등록하는 프리셋에서는 그 Agent에 대해 자체 도구가 전역 도구보다 우선합니다. 번들 계층를 선택하지 않고 제공자와 도구를 마운트하려면 `cordis.patch.yml`에 같은 행을 삽입하세요.

```yaml
- insert:
    - id: subagent-claude-code
      name: '@deepseek-ai/dsh-subagent-claude-code'
    - id: tool-subagent-claude-code
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: claude-code
        toolName: subagent_claude_code
        maxDepth: provider-managed
```

도구는 작업을 수락한 뒤 자식 ID를 반환하고 완료되면 결과를 부모 Agent에 보냅니다. 각 외부 실행은 한 번만 수행되며 후속 입력이나 재개를 지원하지 않습니다.

### 반환 결과

완료 알림에는 Claude Code의 최종 답변 또는 중지 이유와 선택적인 안전 진단이 담깁니다. 부모 Session은 알림과 별도로 외부 작업 식별 정보와 전체 종료 결과도 보관하며, 로컬 자식 Session은 생성되지 않습니다. 제품의 추론, 도구 활동, 원시 stderr 및 작업공간 diff는 부모 Session에 들어가지 않습니다.

### 실패와 복구

선택적 의존성을 제외하고 설치했거나, 지원되지 않는 플랫폼을 사용하거나, 선택된 페이로드가 없어진 경우 제공자는 비활성 상태로 남습니다. 첫 위임은 SDK 시작 단계에서 안전한 `query-start` / `unknown` 실패 정보와 함께 실패하며 호스트 CLI로 대체되지 않습니다. 제품의 원래 오류는 내부 원인 체인과 제공자의 호스트 로그에 남습니다. 취소된 실행은 `aborted`로 종료됩니다.

-----

<a id="understand-the-implementation"></a>
## 구현 이해하기

<details>
<summary>구현 내부 — 클릭하여 펼치기</summary>

이 섹션에서는 제공자가 실제 Claude Code CLI를 구동하는 방법과 관찰되는 동작의 출처를 설명합니다. 전체 계약은 [이 패키지 사용하기](#use-this-package)에 있습니다.

### 설계 개념

- **실행마다 새로운 쿼리 하나.** 각 실행은 독립적인 SDK 쿼리, 취소 컨트롤러, CLI 프로세스 및 영속화되지 않는 제품 세션을 가집니다. 이어서 실행, 재개, 풀링은 지원하지 않습니다.
- **네이티브 설정이 우선합니다.** 제공자는 SDK의 `settingSources` 옵션을 의도적으로 생략하므로 Claude Code는 호스트의 일반적인 사용자, 프로젝트 및 로컬 설정을 읽습니다. 선택적인 `model`과 필수 `permissionMode`만 쿼리 수준에서 재정의합니다.
- **무인 실행을 전제로 합니다.** `AskUserQuestion`은 비활성화되고 우회 모드를 제외하면 권한 요청이 거부되므로 쿼리가 사용자 인터페이스를 기다리지 않습니다.

### 소스 맵

| 파일 | 역할 |
|---|---|
| [`src/index.ts`](src/index.ts) | 플러그인 진입점: 설정 스키마, 제공자 등록 |
| [`src/run.ts`](src/run.ts) | SDK 쿼리 수명 주기, 결과 수락 및 권한 처리 |
| [`src/process.ts`](src/process.ts) | 정리 시 관리 범위의 단계적 종료 |
| [`cordis.patch.yml`](cordis.patch.yml) | 제공자를 등록하고 프리셋 위임 도구를 추가하는 프로필 계층 |

### 실행 흐름

시작 요청은 비어 있지 않은 텍스트 블록 시퀀스만 받아들이고 부모 세션에서 자식 cwd를 결정합니다. 전용 `AbortController`를 생성하고 정확히 이어 붙인 작업으로 공식 SDK의 `query()`를 호출합니다. SDK의 사용자 지정 spawn 훅이 서브프로세스 경계에서 소유하는 살아 있는 CLI 핸들을 제공한 뒤에만 실행을 공개합니다. 제공자는 전체 메시지 스트림을 순회하며 `subtype: "success"`, `is_error: false`, 비어 있지 않은 `result`를 가진 `result` 메시지와 그 뒤의 정상적인 반복 종료만 수락합니다. 그 밖의 모든 결과는 수명 주기 단계와 관찰된 프로세스 결과를 명시하는 고정 범주의 `error` 진단으로 변환됩니다. 범주 집합은 [`src/run.ts`](src/run.ts)에 있습니다. 로컬 취소는 결과 경쟁에서 우선하며 실패 진단 없이 `aborted`로 변환됩니다.

</details>

-----

<a id="further-exploration"></a>
## 더 알아보기

패키지 수준의 계약만으로 충분하지 않을 때 다음 문서를 참고하세요. 이 제공자에서 연결 지점와 다른 제품의 제공자로 이어지는 자료입니다.

- [서브에이전트 하위 시스템](../../../docs/subsystems/subagent.md) — 서비스 계약, 제공자 계약 및 종료 결과의 의미.
- [dsh-subagent 연결 지점](../subagent/README.md) — 이 제공자가 등록되는 레지스트리와 시작 API.
- [Codex 서브에이전트 제공자](../subagent-codex/README.md) — 공식 app-server 프로토콜을 사용하는 다른 제품의 백엔드.
- [Claude Code 및 Codex 백엔드의 과거 기록](../../../.agents/notes/archived/feature/2026-08-04-claude-code-and-codex-subagent-backends.md) — 제품 제공자의 설계 기록.
- [생성된 설정 카탈로그](../../../docs/config-catalog.md#deepseek-aidsh-subagent-claude-code) — 허용되는 모든 설정 필드와 해당 소스 선언.

-----

<a id="model-experience"></a>
## 모델 경험

### 자식 요청

#### 모델에 표시되는 내용

Claude Code 자식은 독립적인 텍스트 작업을 새로운 SDK 쿼리 하나로 받습니다. 작업공간은 선택된 자식 작업 디렉터리입니다. 선택된 제공자 인스턴스가 쿼리의 설정된 모델, 환경 및 비대화형 권한 모드를 고정하며, 모델이 생략된 경우의 모델과 그 밖의 모든 제품 설정은 네이티브 Claude 구성에서 가져옵니다. 실행 파일 버전은 Bundle의 버전 고정 SDK 플랫폼 페이로드에서 결정됩니다.

#### 토큰 영향

자식은 독립적인 Claude Code 컨텍스트와 쿼리의 토큰을 사용합니다. 자식 토큰은 부모 컨텍스트에 들어가지 않습니다.

#### KV 캐시 영향

부모 요청 캐시와 독립적입니다. 재사용 여부는 Claude Code 자체의 모델, 지침, 도구, 네이티브 설정 및 새로운 쿼리에만 달려 있습니다.

### 부모 스케줄링과 결과(간접 영향)

#### 모델에 표시되는 내용

부모 모델은 `dsh-tool-subagent`를 통해 먼저 자식 ID를 받고, 이후 Claude Code 최종 답변이나 중지 이유와 안전 진단이 포함된 실패 알림을 받습니다. 진단에는 고정된 단계와 범주, 관찰된 프로토콜 또는 프로세스 정보만 포함됩니다. 제품의 추론, 중간 메시지, 도구 활동, stderr, 사용량, 제품 식별자, 명령, 경로 및 원시 프로토콜 페이로드는 부모 Session에 복사되지 않습니다.

#### 토큰 영향

부모 입력에는 최종 답변 또는 실패 세부 정보를 포함한 시작 확인과 완료 알림만큼 내용이 추가됩니다. 자식 토큰은 부모 컨텍스트에 들어가지 않습니다. 이 제공자 자체는 부모 도구 스키마를 추가하지 않습니다.

#### KV 캐시 영향

시작 확인과 완료 알림은 재사용 가능한 부모 요청 접두부 뒤에 추가됩니다. 알림은 기존 접두부를 다시 쓰지 않고 다음 턴을 깨울 수 있습니다.

## 알려진 제한 사항과 미뤄진 작업

<a id="known-limitations-and-deferred-work"></a>


다음 제한은 이 제공자가 적합하지 않거나 운영상 특별한 주의가 필요한 경우를 정의합니다. 이는 현재 패키지의 제약이며, Claude Code 전반에 대한 비교나 작업 백로그가 아닙니다.

- **실행마다 새로운 쿼리와 프로세스 하나** — 이어서 실행, 재개, 풀링, 진행 스트림 또는 제품 세션 영속화를 지원하지 않습니다.
- **고정된 인스턴스 선택** — 프로필 행에서 제공자 이름, 선택적 모델 및 도구 바인딩을 고정합니다. 호출 시 제공자나 모델을 동적으로 선택하거나 변경할 수 없으며, 노출된 각 도구에는 고유한 `toolName`이 필요합니다.
- **호스트 설정이 의도적으로 우선함** — `model`을 생략하면 프로젝트와 사용자 설정에서 모델을 선택합니다. 나머지 도구와 동작은 항상 네이티브 설정을 따르며 제공자는 필터링되거나 완전히 격리된 프로덕션 모드를 제공하지 않습니다.
- **인증과 계정 상태는 네이티브 방식 유지** — Bundle은 CLI를 제공하지만 계정을 만들거나 로그인하거나 Claude 설정을 다시 쓰지 않습니다. 설정 및 인증 실패는 별도의 공개 분류 대신 해당 수명 주기 단계와 안전한 `unknown` 대체 값으로 표시됩니다.
- **위임 시 SDK 플랫폼 페이로드 필요** — 선택적 의존성을 제외한 설치, 지원되지 않는 플랫폼, 누락되거나 손상된 페이로드는 첫 쿼리에서 실패합니다. 호스트 CLI로 대체되지 않습니다.
- **사람과 상호작용하는 경로 없음** — `AskUserQuestion`은 비활성화되고, 권한 요청은 거부되며, MCP elicitation은 거절됩니다. 차단 대화상자는 대기하지 않고 안전하게 실패합니다.
- **어시스턴트 페이로드는 최종 텍스트만 포함** — 실패한 실행은 별도의 안전 진단도 표시할 수 있습니다. 추론, 중간 메시지, 도구 통신, 사용량, stderr 및 작업공간 diff는 부모 Session에 들어가지 않습니다. 작업 식별 정보와 종료 결과는 부모 로그에 보관됩니다.
- **선택적 공유 기능 없음** — 이 제공자에 대해 공유 서비스는 `agentPreset`, `agentOptions`, 출력 스키마 및 harness 깊이 제한 적용을 거부합니다.
- **실제 경과 시간 제한이나 부작용 롤백 없음** — 오래 걸리는 작업은 호출자가 취소하며, 취소 전에 변경된 파일이나 외부 시스템은 복원되지 않습니다.

<a id="dev-note"></a>
### 개발 참고

<details>
<summary>유지관리자를 위한 작업 맥락 — 클릭하여 펼치기</summary>

이 개발 참고는 유지관리자를 위한 작업 맥락으로, 열린 질문과 아직 결정되지 않은 방향을 담습니다. 명시적으로 권위 있는 기준이 아니며, 제공되는 동작과 제한은 위 섹션과 패키지 코드에 있습니다.

- **페이로드 크기 공개** — 현재 darwin-arm64 플랫폼 페이로드는 압축 시 약 92 MB, 압축 해제 시 약 325 MB입니다. 이는 정보 공개용 수치이며 설치 기준이 아닙니다.
- **버전이 고정된 프로토콜** — 런타임 의존성은 Agent SDK 0.3.263에 고정되어 있습니다. 업그레이드하려면 새 SDK 버전을 고정하고 키 없이 수행하는 실제 제품 및 로더 설정 검증을 다시 실행해야 합니다.

</details>
