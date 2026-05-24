/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext, useMemo } from "react";

export type DashboardLanguage = "en" | "ko";

const KOREAN_COPY: Record<string, string> = {
  Control: "제어",
  "No live trading": "실거래 차단",
  "Control Plane Dashboard": "컨트롤 플레인 대시보드",
  "One-page operating surface for autonomous research, deterministic risk, paper account state, broker read-only evidence, blockers, and next safe action. Broker and live order paths remain disabled.":
    "자율 리서치, 결정적 리스크, 모의 계정 상태, 브로커 읽기 전용 증거, 차단 항목, 다음 안전 행동을 한 화면에서 확인합니다. 브로커와 실거래 주문 경로는 계속 비활성화됩니다.",
  "Broker execution": "브로커 실행",
  "Live trading": "실거래",
  "Live gate": "실거래 게이트",
  brokerExecutionEnabled: "브로커 실행",
  liveTradingEnabled: "실거래",
  liveGate: "실거래 게이트",
  Intent: "의도",
  Blockers: "차단 항목",
  true: "켜짐",
  false: "꺼짐",
  yes: "예",
  no: "아니오",
  none: "없음",
  never: "없음",
  free: "해제",
  attempt: "시도",
  error: "오류",
  active: "활성",
  consumed: "소비됨",
  reconciled: "대사됨",
  not_checked: "미확인",
  "no action id": "행동 ID 없음",
  "no paper plan": "모의 계획 없음",
  snapshot: "스냅샷",
  "no snapshot": "스냅샷 없음",
  "no fill": "체결 없음",
  "no plan": "계획 없음",
  position: "포지션",
  fee: "수수료",
  quantity: "수량",
  notional: "명목금액",
  lock: "락",
  "Dashboard language": "대시보드 언어",
  "Kill switch": "킬 스위치",
  "Kill switch detail": "킬 스위치 상세",
  "Emergency stop": "긴급 정지",
  "Stopping...": "정지 중...",
  "Kill switch tripped": "킬 스위치 작동됨",
  "Kill switch is armed; execution control is active.":
    "킬 스위치가 준비되어 있고 실행 제어는 활성 상태입니다.",
  "Kill switch trip failed. Verify the control-plane API before any further automation.":
    "킬 스위치 작동에 실패했습니다. 추가 자동화 전에 컨트롤 플레인 API를 확인하세요.",
  "Runtime stop, not broker cancel.":
    "런타임 정지이며 브로커 주문 취소가 아닙니다.",
  "Emergency controls": "긴급 제어",
  "dry run only": "드라이런 전용",
  "runtime stop": "런타임 정지",
  "cancel orders": "주문 취소",
  "flatten positions": "포지션 청산",
  "open order poll": "미체결 주문 조회",
  "Broker Order Lifecycle": "브로커 주문 생명주기",
  "API broker order statuses": "API 브로커 주문 상태",
  "Loading broker order statuses": "브로커 주문 상태 로딩 중",
  "Documented broker lifecycle sample": "문서화된 브로커 생명주기 샘플",
  "Broker order status API is unavailable. Showing documented broker lifecycle sample.":
    "브로커 주문 상태 API를 사용할 수 없어 문서화된 브로커 생명주기 샘플을 표시합니다.",
  "Broker order status refresh failed after automation action.":
    "자동화 작업 후 브로커 주문 상태 새로고침에 실패했습니다.",
  "Read-only broker order lifecycle evidence. It shows broker-side order truth, not broker writes.":
    "읽기 전용 브로커 주문 생명주기 증거입니다. 브로커 측 주문 사실을 보여줄 뿐 주문을 쓰지 않습니다.",
  "Open orders": "미체결 주문",
  "Terminal orders": "종결 주문",
  "Dry-run mismatches": "드라이런 불일치",
  "Unlinked orders": "연결 안 된 주문",
  "Dry-run command mismatch": "드라이런 명령 불일치",
  "Recent broker order statuses": "최근 브로커 주문 상태",
  "as of": "기준 시각",
  "broker ref": "브로커 참조",
  remaining: "잔량",
  submitted: "제출됨",
  accepted: "접수됨",
  partially_filled: "부분 체결",
  pending_cancel: "취소 대기",
  filled: "체결 완료",
  cancelled: "취소됨",
  rejected: "거절됨",
  expired: "만료됨",
  unlinked: "연결 안 됨",
  imported: "가져옴",
  "Dashboard emergency stop": "대시보드 긴급 정지",
  "Action Audit Timeline": "행동 감사 타임라인",
  "Chronological audit feed across research, schedules, approvals, paper execution, broker evidence, and emergency controls.":
    "리서치, 스케줄, 승인, 모의 실행, 브로커 증거, 긴급 제어를 시간순으로 보여주는 감사 피드입니다.",
  "No action audit events recorded yet.":
    "아직 행동 감사 이벤트가 기록되지 않았습니다.",
  "Live action timeline": "실시간 행동 타임라인",
  "Loading action timeline": "행동 타임라인 로딩 중",
  "Documented audit sample": "문서화된 감사 샘플",
  "Action timeline API is unavailable. Showing documented audit sample.":
    "행동 타임라인 API를 사용할 수 없어 문서화된 감사 샘플을 표시합니다.",
  "Action timeline refresh failed after automation action.":
    "자동화 작업 후 행동 타임라인 새로고침에 실패했습니다.",
  events: "이벤트",
  control: "제어",
  market_data: "시장 데이터",
  broker: "브로커",
  "Risk ALLOW": "리스크 허용",
  "Paper plan reconciled": "모의 계획 대사 완료",
  "Broker snapshot matched": "브로커 스냅샷 일치",
  "Risk evaluation risk-docs-001 returned ALLOW.":
    "risk-docs-001 리스크 평가가 ALLOW를 반환했습니다.",
  "1 paper orders / 1 fills / matched.": "모의 주문 1건 / 체결 1건 / 일치.",
  "Read-only broker snapshot matched paper account evidence.":
    "읽기 전용 브로커 스냅샷이 모의 계정 증거와 일치했습니다.",
  armed: "준비됨",
  tripped: "작동됨",
  "Market ingestion": "시장 데이터 수집",
  universe: "유니버스",
  "last ingestion": "최근 수집",
  bars: "봉",
  succeeded: "성공",
  skipped: "건너뜀",
  failed: "실패",
  "Market-data ingestion API is unavailable. Showing documented disabled worker sample.":
    "시장 데이터 수집 API를 사용할 수 없어 문서화된 비활성 워커 샘플을 표시합니다.",
  "Market-data ingestion run API is unavailable. Showing documented disabled worker sample.":
    "시장 데이터 수집 실행 API를 사용할 수 없어 문서화된 비활성 워커 샘플을 표시합니다.",
  "Market-data ingestion status refresh failed after automation action.":
    "자동화 작업 후 시장 데이터 수집 상태 새로고침에 실패했습니다.",
  "Market-data ingestion run refresh failed after automation action.":
    "자동화 작업 후 시장 데이터 수집 실행 새로고침에 실패했습니다.",
  "Paper auto": "모의 자동승인",
  dataset: "데이터셋",
  symbol: "심볼",
  benchmark: "벤치마크",
  freshness: "신선도",
  sample: "샘플",
  "not enforced": "미적용",
  paper_auto: "모의 자동승인",
  recovery_auto: "회수 자동승인",
  human: "수동 승인",
  "Paper Order Approval": "모의 주문 승인",
  "paper auto approval": "모의 자동승인",
  "recovery auto approval": "회수 자동승인",
  "human approval": "수동 승인",
  approvedByRun: "승인 실행",
  approvedBySchedule: "승인 스케줄",
  autoApprovalPolicy: "자동승인 정책",
  "Approval evidence": "승인 증거",
  "no approval": "승인 없음",
  "Standing schedule authorization for paper-only autonomous execution. Broker and live trading remain disabled.":
    "모의 전용 자율 실행을 위한 스케줄 상시 승인입니다. 브로커와 실거래는 계속 비활성입니다.",
  "Auto-approved paper-only execution under the active budget policy. Broker and live trading remain disabled.":
    "활성 예산 정책에 따라 모의 전용 실행을 자동 승인했습니다. 브로커와 실거래는 계속 비활성입니다.",

  "Action Status": "행동 상태",
  checked: "확인",
  "Latest system action": "최근 시스템 행동",
  "Paper evidence": "모의거래 증거",
  "Broker truth": "브로커 대조",
  "Broker fill": "브로커 체결",
  "Current blocker": "현재 차단",
  "Next safe action": "다음 안전 행동",
  "No immediate action blocker detected": "즉시 조치할 차단 항목 없음",
  "Refresh control-plane status before advancing.":
    "진행 전에 컨트롤 플레인 상태를 새로고침하세요.",
  "No action status reported yet": "아직 행동 상태가 보고되지 않았습니다.",
  "No paper order plan has been created yet":
    "아직 모의 주문 계획이 생성되지 않았습니다.",
  "No broker snapshot evidence has been imported yet":
    "아직 브로커 스냅샷 증거가 가져와지지 않았습니다.",
  "No broker fill evidence has been imported yet":
    "아직 브로커 체결 증거가 가져와지지 않았습니다.",

  "Autonomous Action Chain": "자율 행동 체인",
  "Budget / research / proposal / risk / approval / paper / broker":
    "예산 / 리서치 / 제안 / 리스크 / 승인 / 모의 / 브로커",
  Budget: "예산",
  Research: "리서치",
  Proposal: "제안",
  Risk: "리스크",
  Approval: "승인",
  "Paper Account": "모의 계정",
  "Paper Execution": "모의 실행",
  "Broker Truth": "브로커 대조",
  missing: "없음",
  matched: "일치",
  blocked: "차단",
  ready: "준비",
  attention: "주의",
  started: "시작됨",
  partial: "부분",
  disabled: "비활성",
  enabled: "활성",
  reducing: "축소 중",
  off: "꺼짐",
  open: "미해결",
  verified: "검증됨",
  fresh: "최신",
  stale: "오래됨",
  "No active budget envelope": "활성 예산 봉투 없음",
  "No reproducible research run": "재현 가능한 리서치 실행 없음",
  "Create proposal from proposal-ready research run":
    "제안 준비 리서치 실행에서 제안 생성",
  "No generated proposal": "생성된 제안 없음",
  "Risk evaluation recorded": "리스크 평가 기록됨",
  "No proposal risk evaluation": "제안 리스크 평가 없음",
  "No signed paper order approval": "서명된 모의 주문 승인 없음",
  "Seed and promote a paper account": "모의 계정을 생성하고 활성화",
  "No paper order plan": "모의 주문 계획 없음",
  "No read-only broker snapshot": "읽기 전용 브로커 스냅샷 없음",
  "No proposal records yet": "아직 제안 기록 없음",
  "Deterministic risk gate is registered": "결정적 리스크 게이트 등록됨",
  "Documented risk evaluation sample is available":
    "문서화된 리스크 평가 샘플 사용 가능",
  "Research-run ledger exposes reproducible backtest records":
    "리서치 실행 원장이 재현 가능한 백테스트 기록을 제공합니다",
  "Documented autonomous run ledger sample is available":
    "문서화된 자율 실행 원장 샘플 사용 가능",
  "Paper simulator ledger exists; broker-grade paper readiness is blocked by production signing custody and broker reconciliation":
    "모의 시뮬레이터 원장은 있으나 프로덕션 서명 보관과 브로커 대사 때문에 브로커급 모의 준비는 차단됨",
  "Deterministic paper order-plan, fill, and reconciliation ledger is registered":
    "결정적 모의 주문 계획, 체결, 대사 원장 등록됨",
  "Documented database paper reservation hold ledger is available":
    "문서화된 데이터베이스 모의 예약 보류 원장 사용 가능",
  "Paper account reservation readiness, hold creation, and final apply run inside a TypeORM transaction after an optimistic account lock-version claim":
    "낙관적 계정 락 버전 클레임 후 예약 준비 재계산, 보류 생성, 최종 반영을 TypeORM 트랜잭션 안에서 실행합니다.",
  "Paper account lock readiness requires a TypeORM DataSource transaction boundary":
    "모의 계정 락 준비에는 TypeORM DataSource 트랜잭션 경계가 필요합니다.",
  "Production schema policy requires TYPEORM_SYNCHRONIZE=false and TYPEORM_MIGRATIONS_RUN=true":
    "운영 스키마 정책에는 TYPEORM_SYNCHRONIZE=false 및 TYPEORM_MIGRATIONS_RUN=true가 필요합니다.",
  "Production schema policy uses explicit TypeORM migrations with synchronize disabled and no pending migrations":
    "운영 스키마 정책은 synchronize 비활성화와 미적용 마이그레이션 없는 명시적 TypeORM 마이그레이션을 사용합니다.",
  "Production schema migrations are not enforced":
    "운영 스키마 마이그레이션이 강제되지 않았습니다.",
  "Production schema policy is blocked: TYPEORM_SYNCHRONIZE must be false in production; TYPEORM_MIGRATIONS_RUN must be true in production; Pending schema migrations must be applied":
    "운영 스키마 정책 차단: 운영에서는 TYPEORM_SYNCHRONIZE=false, TYPEORM_MIGRATIONS_RUN=true가 필요하며 미적용 마이그레이션을 먼저 적용해야 합니다.",
  "No durable paper account records yet": "아직 영구 모의 계정 기록 없음",
  "Documented append-only paper account event sample is available":
    "문서화된 추가 전용 모의 계정 이벤트 샘플 사용 가능",
  "Execution control state defaults to active":
    "실행 제어 상태는 기본적으로 활성",
  "Documented signed order-plan approval sample is available":
    "문서화된 서명 주문 계획 승인 샘플 사용 가능",
  "Live broker adapter is not implemented; read-only snapshot ledger is available":
    "실브로커 어댑터는 구현되지 않았고 읽기 전용 스냅샷 원장은 사용 가능",
  "Provider-neutral Toss readiness contract exposes broker blockers":
    "공급자 중립 Toss 준비 계약이 브로커 차단 항목을 노출",
  "Documented broker read-only snapshot sample is available":
    "문서화된 브로커 읽기 전용 스냅샷 샘플 사용 가능",
  "Documented funding readiness sample is available":
    "문서화된 자금 준비 샘플 사용 가능",
  "Latest funding readiness is ready: expected deposit matches read-only broker cash and equity":
    "최근 자금 준비 상태가 준비됨: 예상 입금액이 읽기 전용 브로커 현금 및 자산과 일치합니다.",
  "Documented broker read-only fill sample is available":
    "문서화된 브로커 읽기 전용 체결 샘플 사용 가능",
  "Live trading gate is disabled until broker write access, credential custody, kill switch, and live-provider fill polling are verified.":
    "브로커 쓰기 권한, 자격 증명 보관, 킬 스위치, 실공급자 체결 폴링이 검증될 때까지 실거래 게이트는 비활성입니다.",
  "Live trading gate is disabled until broker write access, credential custody, kill switch, fill polling, and reconciliation are verified.":
    "브로커 쓰기 권한, 자격 증명 보관, 킬 스위치, 체결 폴링, 대사가 검증될 때까지 실거래 게이트는 비활성입니다.",
  "Live trading gate is disabled until broker write access, credential custody, fill polling, reconciliation, and broker-order emergency controls are verified.":
    "브로커 쓰기 권한, 자격 증명 보관, 체결 폴링, 대사, 브로커 주문 긴급 제어가 검증될 때까지 실거래 게이트는 비활성입니다.",
  "No verified Toss read-only adapter schema or credentials":
    "검증된 Toss 읽기 전용 어댑터 스키마 또는 자격 증명 없음",
  "No production signed order-plan workflow":
    "프로덕션 서명 주문 계획 워크플로 없음",
  "No production-verified broker polling loop":
    "프로덕션 검증 브로커 폴링 루프 없음",
  "No production kill switch runtime": "프로덕션 킬 스위치 런타임 없음",
  "Runtime stop exists for autonomous advancement; broker-order cancel/flatten controls are not implemented.":
    "자율 진행을 멈추는 런타임 정지는 있지만 브로커 주문 취소/청산 제어는 아직 구현되지 않았습니다.",
  "Runtime stop can halt autonomous advancement, but broker-order cancel/flatten emergency controls are not implemented.":
    "런타임 정지는 자율 진행을 멈출 수 있지만 브로커 주문 취소/청산 긴급 제어는 아직 구현되지 않았습니다.",
  "killSwitch: Broker-order cancel/flatten controls are not implemented.":
    "killSwitch: 브로커 주문 취소/청산 제어가 아직 구현되지 않았습니다.",

  "Automation Action Ledger": "자동화 행동 원장",
  "Live broker off": "실브로커 꺼짐",
  "Ticking schedule": "스케줄 실행 중",
  "Tick schedule": "스케줄 실행",
  "Advancing run": "실행 진행 중",
  "Advance latest run": "최신 실행 진행",
  Worker: "작업자",
  Attention: "주의",
  Processing: "처리 중",
  Idle: "대기",
  Disabled: "비활성",
  Waiting: "대기 중",
  due: "예정",
  leases: "리스",
  worker: "작업자",
  cron: "크론",
  ttl: "TTL",
  max: "최대",
  "last tick": "최근 틱",
  "last result": "최근 결과",
  schedule: "스케줄",
  state: "상태",
  cadence: "주기",
  next: "다음",
  lease: "리스",
  expires: "만료",
  paper: "모의",
  "last cycle": "최근 사이클",
  "last error": "최근 오류",
  "No autonomous run has been recorded yet.": "아직 자율 실행 기록이 없습니다.",
  "Latest run": "최근 실행",
  run: "실행",
  stage: "단계",
  cycle: "사이클",
  proposal: "제안",
  risk: "리스크",
  "Next action": "다음 행동",
  "No next action recorded": "기록된 다음 행동 없음",
  Timeline: "타임라인",
  "Continue monitoring; live trading remains disabled.":
    "계속 모니터링하세요. 실거래는 비활성 상태입니다.",
  "Generate SELL-only recovery proposal": "매도 전용 회수 제안 생성",
  "Evaluate recovery proposal risk": "회수 제안 리스크 평가",
  "Wait for signed recovery paper approval before execution":
    "실행 전에 서명된 회수 모의 승인 대기",
  "Review recovery risk decision before paper execution":
    "모의 실행 전에 회수 리스크 판단 검토",
  "Reconcile recovery paper order plan and broker read-only snapshot":
    "회수 모의 주문 계획과 브로커 읽기 전용 스냅샷 대사",
  "Execution control is reducing": "실행 제어가 축소 상태입니다",

  "System Readiness Matrix": "시스템 준비 매트릭스",
  "gates ready": "게이트 준비",
  Fallback: "대체 데이터",
  "API Connected": "API 연결됨",
  "Showing documented defaults.": "문서화된 기본값을 표시합니다.",
  Ready: "준비",
  Blocked: "차단",
  Partial: "부분",
  Missing: "없음",
  "Live Trading Gate": "실거래 게이트",
  "Remaining blockers": "남은 차단 항목",

  "Research Run Ledger": "리서치 실행 원장",
  "Broker disabled": "브로커 비활성",
  "Running dry-run backtest": "드라이런 백테스트 실행 중",
  "Run dry-run backtest": "드라이런 백테스트 실행",
  "Baseline research dry-run": "기준 리서치 드라이런",
  "No research runs recorded yet.": "아직 리서치 실행 기록이 없습니다.",
  Run: "실행",
  "Backtest Metrics": "백테스트 지표",
  Benchmark: "벤치마크",
  Drawdown: "낙폭",
  Evidence: "증거",
  Sharpe: "샤프",
  Trades: "거래",
  lineage: "계보",
  "unknown provider": "알 수 없는 공급자",
  "unlabeled source": "라벨 없는 소스",
  to: "부터",
  available: "사용 가능",
  "market data": "시장 데이터",

  "Paper Execution Enclave": "모의 실행 영역",
  Started: "시작됨",
  "Paper Account State": "모의 계정 상태",
  "Paper account state is loading.": "모의 계정 상태를 불러오는 중입니다.",
  "No promoted paper account is active yet. Seed and promote a paper account before paper execution.":
    "아직 활성화된 모의 계정이 없습니다. 모의 실행 전에 모의 계정을 생성하고 활성화하세요.",
  "Recovery proposal": "복구 제안",
  "Current Cycle Evidence": "현재 사이클 증거",
  "Latest autonomous cycle data, approval, paper result, and recovery state.":
    "최근 자율 사이클의 데이터, 승인, 모의 결과, 회수 상태입니다.",
  Cycle: "사이클",
  "Research Data": "리서치 데이터",
  "Decision Chain": "판단 체인",
  "Auto Approval": "자동 승인",
  "Paper Result": "모의 결과",
  Recovery: "회수",
  unknown: "알 수 없음",
  not_needed: "불필요",
  proposal_created: "제안 생성됨",
  risk_checked: "리스크 확인됨",
  waiting_approval: "승인 대기",
  paper_executed: "모의 실행됨",
  "Generate a SELL-only recovery proposal from active paper positions.":
    "활성 모의 포지션에서 매도 전용 복구 제안을 생성합니다.",
  "Creating...": "생성 중...",
  "Create sell-only recovery": "매도 전용 복구 생성",
  "No long paper positions are available for a recovery proposal.":
    "복구 제안에 사용할 롱 모의 포지션이 없습니다.",
  Cash: "현금",
  Equity: "자산",
  "Gross exposure": "총 노출",
  Currency: "통화",
  "Execution control": "실행 제어",
  Positions: "포지션",
  "No paper positions recorded.": "기록된 모의 포지션이 없습니다.",
  qty: "수량",
  avg: "평균",
  cost: "원가",
  realized: "실현",
  "Last reconciliation": "최근 대사",
  "Not reconciled": "대사 안 됨",
  "Latest plan": "최근 계획",
  "No reconciled plan": "대사된 계획 없음",
  "Recent ledger changes": "최근 원장 변경",
  "No paper ledger changes recorded.": "기록된 모의 원장 변경이 없습니다.",
  "Account event chain": "계정 이벤트 체인",
  "No paper account events recorded.": "기록된 모의 계정 이벤트가 없습니다.",
  "Paper execution control is active.": "모의 실행 제어가 활성 상태입니다.",
  "Applied API paper order plan.": "API 모의 주문 계획을 적용했습니다.",

  "API fallback": "API 대체",
  "No paper order plans recorded yet.": "아직 모의 주문 계획 기록이 없습니다.",
  "Plan hash": "계획 해시",
  "Proposal hash": "제안 해시",
  Idempotency: "멱등키",
  Hold: "보류",
  Reservations: "예약",
  cash: "현금",
  "available ": "사용 가능 ",
  "reserved ": "예약 ",
  Custody: "보관",
  "account event": "계정 이벤트",
  "Approval event": "승인 이벤트",
  "Current event": "현재 이벤트",
  "Planned orders": "계획 주문",
  "Paper fills": "모의 체결",
  "No fills recorded for this paper plan.":
    "이 모의 계획에는 체결 기록이 없습니다.",
  Reconciliation: "대사",
  Status: "상태",
  "Expected cash": "예상 현금",
  "Cash diff": "현금 차이",
  notes: "메모",

  "Broker Snapshot Monitor": "브로커 스냅샷 모니터",
  "Read-only broker evidence. No credentials, order payloads, or callable broker actions are exposed here.":
    "읽기 전용 브로커 증거입니다. 자격 증명, 주문 페이로드, 호출 가능한 브로커 행동은 노출되지 않습니다.",
  "broker write disabled": "브로커 쓰기 비활성",
  credential: "자격 증명",
  custody: "보관",
  "read only ready": "읽기 전용 준비",
  configured: "설정됨",
  poller: "폴러",
  schema: "스키마",
  live: "실거래",
  external: "외부",
  "env only": "환경변수만",
  "Read-only polling": "읽기 전용 폴링",
  "can poll": "폴링 가능",
  "last attempt": "최근 시도",
  "last poll": "최근 폴링",
  "latest snapshot": "최근 스냅샷",
  "auto reconcile": "자동 대사",
  "Fill polling": "체결 폴링",
  path: "경로",
  "last fill poll": "최근 체결 폴링",
  "latest fills": "최근 체결",
  "fill reconcile": "체결 대사",
  "Broker adapter gates": "브로커 어댑터 게이트",
  "Broker blockers": "브로커 차단 항목",
  "No broker read-only snapshot has been imported yet.":
    "아직 읽기 전용 브로커 스냅샷을 가져오지 않았습니다.",
  "No broker read-only fill evidence has been imported yet.":
    "아직 읽기 전용 브로커 체결 증거를 가져오지 않았습니다.",
  Exposure: "노출",
  "As of": "기준",
  "Broker Fill Evidence": "브로커 체결 증거",
  fills: "체결",
  Symbol: "종목",
  Side: "방향",
  Notional: "명목금액",
  Recon: "대사",
  "Paper Match": "모의 대조",
  plan: "계획",
  fill: "체결",
  "not yet": "아직",
  "Qty diff": "수량 차이",
  "Notional diff": "명목 차이",
  "Fee diff": "수수료 차이",
  cashDiff: "현금 차이",
  equityDiff: "자산 차이",
  tolerance: "허용 오차",
  maxAgeMinutes: "최대 지연 시간",

  "Funding Readiness": "자금 준비 상태",
  "Expected deposit must match a reconciled read-only broker snapshot before automation can treat capital as usable.":
    "자동화가 자금을 사용할 수 있다고 보기 전에 예상 입금액이 대사 완료된 읽기 전용 브로커 스냅샷과 일치해야 합니다.",
  "Expected deposit": "예상 입금액",
  "Broker cash": "브로커 현금",
  "Snapshot age": "스냅샷 경과",
  minutes: "분",
  "broker snapshot": "브로커 스냅샷",
  reconciliation: "대사",
  "Funding blockers": "자금 차단 항목",
  "expected deposit matches read-only broker truth":
    "예상 입금액이 읽기 전용 브로커 증거와 일치합니다.",
  "No funding readiness record has matched expected deposit to read-only broker truth":
    "예상 입금액이 읽기 전용 브로커 증거와 일치한 자금 준비 기록이 없습니다.",
  "Funding readiness API is unavailable. Showing documented funding sample.":
    "자금 준비 API를 사용할 수 없어 문서화된 자금 샘플을 표시합니다.",
  "Funding readiness refresh failed after automation action.":
    "자동화 작업 후 자금 준비 상태 새로고침에 실패했습니다.",
  "Funding readiness is read-only broker evidence. No order endpoint was called.":
    "자금 준비 상태는 읽기 전용 브로커 증거입니다. 주문 엔드포인트는 호출되지 않았습니다.",

  "Broker Write Readiness": "브로커 쓰기 준비 상태",
  "Broker-write preflight evidence. This panel explains why real-money broker writes remain out of active scope.":
    "브로커 쓰기 사전 점검 증거입니다. 실제 자금 브로커 쓰기가 왜 active scope 밖인지 보여줍니다.",
  brokerWriteEnabled: "브로커 쓰기",
  orderEndpointImplemented: "주문 엔드포인트",
  Funding: "자금",
  "Schema migrations": "스키마 마이그레이션",
  "Credential custody": "자격 증명 보관",
  "Broker schema": "브로커 스키마",
  "Sandbox parity": "샌드박스 동등성",
  "Cancel orders": "주문 취소",
  "Flatten positions": "포지션 청산",
  "Open-order polling": "미체결 주문 조회",
  "preflight budget": "사전 점검 예산",
  "single order cap": "단일 주문 한도",
  funding: "자금",
  "Broker write blockers": "브로커 쓰기 차단 항목",
  "Broker-write preflight readiness API is unavailable. Showing documented preflight sample.":
    "브로커 쓰기 사전 점검 API를 사용할 수 없어 문서화된 사전 점검 샘플을 표시합니다.",
  "Broker-write preflight readiness refresh failed after automation action.":
    "자동화 작업 후 브로커 쓰기 사전 점검 상태 새로고침에 실패했습니다.",
  "API broker-write preflight readiness": "API 브로커 쓰기 사전 점검",
  "Loading broker-write preflight readiness": "브로커 쓰기 사전 점검 로딩 중",
  "Documented broker-write preflight sample":
    "문서화된 브로커 쓰기 사전 점검 샘플",
  "Documented broker-write preflight readiness sample is available":
    "문서화된 브로커 쓰기 사전 점검 샘플 사용 가능",
  "Latest broker-write preflight readiness is blocked: broker write gates are not ready":
    "최근 브로커 쓰기 사전 점검 상태가 차단됨: 브로커 쓰기 게이트가 준비되지 않았습니다.",
  "Production broker credential custody is not ready":
    "프로덕션 브로커 자격 증명 보관이 준비되지 않았습니다.",
  "Broker OpenAPI schema is not verified":
    "브로커 OpenAPI 스키마가 검증되지 않았습니다.",
  "Broker sandbox or paper environment is not verified":
    "브로커 샌드박스 또는 모의 환경이 검증되지 않았습니다.",
  "Broker read-only polling is not ready":
    "브로커 읽기 전용 폴링이 준비되지 않았습니다.",
  "Broker fill polling is not ready": "브로커 체결 폴링이 준비되지 않았습니다.",
  "Broker cancel/flatten/open-order emergency controls are not ready":
    "브로커 주문 취소/청산/미체결 조회 긴급 제어가 준비되지 않았습니다.",
  "Live order endpoint is not implemented":
    "실거래 주문 엔드포인트가 구현되지 않았습니다.",
  "Broker write access is disabled": "브로커 쓰기 접근이 비활성입니다.",
  "Production signed order-plan custody is not implemented":
    "프로덕션 서명 주문 계획 보관이 구현되지 않았습니다.",

  "Risk Policy": "리스크 정책",
  Gross: "총액",
  Single: "단일",
  Order: "주문",
  "Data age": "데이터 나이",
  "Daily loss": "일일 손실",
  "Latest Risk": "최근 리스크",
  source: "출처",
  mode: "모드",
  "broker flag": "브로커 플래그",
  requiresHumanApproval: "사람 승인 필요",
  orders: "주문",
  "Risk evaluation recorded.": "리스크 평가가 기록되었습니다.",
  "No risk evaluation has been recorded yet.":
    "아직 리스크 평가 기록이 없습니다.",
  "Safety Gates": "안전 게이트",
  "Autonomous Investing Lifecycle": "자율 투자 생명주기",
  "Research reports": "리서치 보고서",
  "Proposal contract": "제안 계약",
  "Paper execution": "모의 실행",
  "Signed approvals": "서명 승인",
  "Phase 0": "0단계",
  "Phase 1": "1단계",
  "Phase 2": "2단계",
  "Phase 3": "3단계",
  "Phase 4": "4단계",
  "Phase 5": "5단계",
  "Safe control-plane start": "안전한 컨트롤 플레인 시작",
  "Proposal contracts": "제안 계약",
  "Research automation": "리서치 자동화",
  "Broker read-only": "브로커 읽기 전용",
  "Future broker-write canary": "향후 브로커 쓰기 카나리",
  "Out of active scope until a future user-approved live-money spec defines budget, approval, and broker-order kill-switch requirements.":
    "향후 사용자가 승인한 실자금 스펙이 예산, 승인, 브로커 주문 킬 스위치 요구사항을 정의하기 전까지 active scope 밖입니다.",
  "Broker Order Command Ledger": "브로커 주문 명령 원장",
  "Dry-run broker command evidence. It shows what would be prepared, not submitted.":
    "드라이런 브로커 명령 증거입니다. 실제 제출이 아니라 준비될 내용을 보여줍니다.",
  "API broker order commands": "API 브로커 주문 명령",
  "Loading broker order commands": "브로커 주문 명령 로딩 중",
  "Documented broker command sample": "문서화된 브로커 명령 샘플",
  "Broker order command API is unavailable. Showing documented broker command sample.":
    "브로커 주문 명령 API를 사용할 수 없어 문서화된 브로커 명령 샘플을 표시합니다.",
  "Broker order command refresh failed after automation action.":
    "자동화 작업 후 브로커 주문 명령 새로고침에 실패했습니다.",
  "Documented broker order command dry-run sample is available":
    "문서화된 브로커 주문 명령 드라이런 샘플 사용 가능",
  command: "명령",
  provider: "공급자",
  "broker-write preflight": "브로커 쓰기 사전 점검",
  preflight: "사전 점검",
  hash: "해시",
  "signed approval": "서명 승인",
  sandbox: "샌드박스",
  "read-only": "읽기 전용",
  cancel: "취소",
  flatten: "청산",
  "open orders": "미체결 주문",
  "Order intents": "주문 의도",
  "Emergency dry runs": "긴급 드라이런",
  "Command blockers": "명령 차단 항목",
  submit_order_plan: "주문 계획 제출",
  cancel_open_orders: "미체결 주문 취소",
  flatten_positions: "포지션 청산",
  "No broker order command dry-run has been recorded.":
    "아직 브로커 주문 명령 드라이런이 기록되지 않았습니다.",
  "No ready broker-write preflight readiness record":
    "준비된 브로커 쓰기 사전 점검 기록이 없습니다.",
  "Live broker order endpoint is not implemented":
    "실브로커 주문 엔드포인트가 구현되지 않았습니다.",
  "Broker order command is dry-run only":
    "브로커 주문 명령은 드라이런 전용입니다.",
  "No signed paper order-plan approval is bound to this command":
    "이 명령에 연결된 서명된 모의 주문 계획 승인이 없습니다.",
  "Broker cancel/replace endpoint is not implemented":
    "브로커 취소/정정 엔드포인트가 구현되지 않았습니다.",
  "Broker open-order polling is not implemented":
    "브로커 미체결 주문 조회가 구현되지 않았습니다.",
  "Broker flatten-position order path is not implemented":
    "브로커 포지션 청산 주문 경로가 구현되지 않았습니다.",
  "Existing reports summarize market context; they are not trade proposals.":
    "기존 보고서는 시장 맥락 요약이며 거래 제안이 아닙니다.",
  "Budget envelopes, proposal records, risk evaluations, research-run provenance, and autonomous run ledgers are implemented.":
    "예산 봉투, 제안 기록, 리스크 평가, 리서치 실행 출처, 자율 실행 원장이 구현되어 있습니다.",
  "Paper simulator ledger, durable paper account, fills, and plan-scoped reconciliation exist; signed plans and broker reconciliation are still missing.":
    "모의 시뮬레이터 원장, 영구 모의 계정, 체결, 계획 범위 대사가 있으며 서명 계획과 브로커 대사는 아직 없습니다.",
  "Durable paper order-plan approvals exist; production signing and live custody review are still missing.":
    "영구 모의 주문 계획 승인은 있으며 프로덕션 서명과 실보관 검토는 아직 없습니다.",
  "Read-only broker snapshot ledger and paper reconciliation exist; a verified Toss adapter is still missing.":
    "읽기 전용 브로커 스냅샷 원장과 모의 대사는 있으며 검증된 Toss 어댑터는 아직 없습니다.",
  "No real-money order path is implemented in this repository.":
    "이 레포에는 실제 자금 주문 경로가 구현되어 있지 않습니다.",
  "Spec, reference policy, backend risk gate, and deterministic denial/review tests.":
    "스펙, 참조 정책, 백엔드 리스크 게이트, 결정적 거절/검토 테스트.",
  "Budget envelopes, proposal entities, risk evaluations, run ledgers, and audit snapshots.":
    "예산 봉투, 제안 엔티티, 리스크 평가, 실행 원장, 감사 스냅샷.",
  "Reproducible research runs with backtests, costs, turnover, drawdown, and benchmarks.":
    "백테스트, 비용, 회전율, 낙폭, 벤치마크가 포함된 재현 가능한 리서치 실행.",
  "Paper order plans, simulator fills, durable paper account state, plan-scoped reconciliation, and execution control gates.":
    "모의 주문 계획, 시뮬레이터 체결, 영구 모의 계정 상태, 계획 범위 대사, 실행 제어 게이트.",
  "Manual read-only broker snapshots and paper-account reconciliation without any callable order endpoint.":
    "호출 가능한 주문 엔드포인트 없이 수동 읽기 전용 브로커 스냅샷과 모의 계정 대사.",
  "Separate design review, tiny budget cap, explicit approval, and immediate kill switch.":
    "별도 설계 리뷰, 소액 예산 한도, 명시 승인, 즉시 킬 스위치.",
  "Separate design review, tiny budget cap, explicit approval, and immediate broker-order kill switch.":
    "별도 설계 리뷰, 소액 예산 한도, 명시 승인, 즉시 브로커 주문 킬 스위치.",

  "Signed Order Approval": "서명된 주문 승인",
  "Durable approval record required before paper fills.":
    "모의 체결 전에 영구 승인 기록이 필요합니다.",
  "live signing disabled": "실서명 비활성",
  approval: "승인",
  idempotency: "멱등키",
  riskEvaluation: "리스크 평가",
  custodyMode: "보관 모드",
  proposalHash: "제안 해시",
  payloadHash: "페이로드 해시",
  signature: "서명",
  signerKey: "서명 키",
  accountEvent: "계정 이벤트",
  approvalHash: "승인 해시",
  approvedAt: "승인 시각",
  expiresAt: "만료 시각",
  consumedBy: "소비 주체",
  "not consumed": "미소비",
  "paper plan": "모의 계획",
  "No signed order-plan approval has been recorded yet.":
    "아직 서명된 주문 계획 승인 기록이 없습니다.",

  "Live API status": "실시간 API 상태",
  "Loading API status": "API 상태 로딩 중",
  "Documented fallback": "문서화된 대체 데이터",
  "Live budgets": "실시간 예산",
  "Loading budgets": "예산 로딩 중",
  "Documented budget sample": "문서화된 예산 샘플",
  "Live research ledger": "실시간 리서치 원장",
  "Loading research ledger": "리서치 원장 로딩 중",
  "Documented sample runs": "문서화된 실행 샘플",
  "Live proposals": "실시간 제안",
  "Loading proposals": "제안 로딩 중",
  "Documented proposal sample": "문서화된 제안 샘플",
  "Live risk evaluations": "실시간 리스크 평가",
  "Loading risk evaluations": "리스크 평가 로딩 중",
  "Documented risk sample": "문서화된 리스크 샘플",
  "Live autonomous runs": "실시간 자율 실행",
  "Loading autonomous runs": "자율 실행 로딩 중",
  "Documented run sample": "문서화된 실행 샘플",
  "Live run schedules": "실시간 실행 스케줄",
  "Loading run schedules": "실행 스케줄 로딩 중",
  "Documented schedule sample": "문서화된 스케줄 샘플",
  "Live schedule worker": "실시간 스케줄 작업자",
  "Loading schedule worker": "스케줄 작업자 로딩 중",
  "Documented worker sample": "문서화된 작업자 샘플",
  "Live paper plans": "실시간 모의 계획",
  "Loading paper plans": "모의 계획 로딩 중",
  "Documented sample plans": "문서화된 계획 샘플",
  "Live paper account": "실시간 모의 계정",
  "Loading paper account": "모의 계정 로딩 중",
  "No paper account": "모의 계정 없음",
  "Live account events": "실시간 계정 이벤트",
  "Loading account events": "계정 이벤트 로딩 중",
  "Documented account events": "문서화된 계정 이벤트",
  "API broker snapshots": "API 브로커 스냅샷",
  "Loading broker snapshots": "브로커 스냅샷 로딩 중",
  "Documented broker sample": "문서화된 브로커 샘플",
  "API funding readiness": "API 자금 준비",
  "Loading funding readiness": "자금 준비 로딩 중",
  "Documented funding sample": "문서화된 자금 샘플",
  "API broker fills": "API 브로커 체결",
  "Loading broker fills": "브로커 체결 로딩 중",
  "Documented broker fill sample": "문서화된 브로커 체결 샘플",
  "API broker adapter status": "API 브로커 어댑터 상태",
  "Loading broker adapter": "브로커 어댑터 로딩 중",
  "Documented broker adapter sample": "문서화된 브로커 어댑터 샘플",
  "Live signed approvals": "실시간 서명 승인",
  "Loading signed approvals": "서명 승인 로딩 중",
  "Documented approval sample": "문서화된 승인 샘플",
};

interface DashboardLanguageContextValue {
  language: DashboardLanguage;
  setLanguage: (language: DashboardLanguage) => void;
  t: (text: string) => string;
}

const defaultContext: DashboardLanguageContextValue = {
  language: "en",
  setLanguage: () => undefined,
  t: (text) => text,
};

const DashboardLanguageContext =
  createContext<DashboardLanguageContextValue>(defaultContext);

export const DashboardLanguageProvider = ({
  children,
  language,
  setLanguage,
}: {
  children: ReactNode;
  language: DashboardLanguage;
  setLanguage: (language: DashboardLanguage) => void;
}) => {
  const value = useMemo<DashboardLanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (text) => (language === "ko" ? (KOREAN_COPY[text] ?? text) : text),
    }),
    [language, setLanguage],
  );

  return (
    <DashboardLanguageContext.Provider value={value}>
      {children}
    </DashboardLanguageContext.Provider>
  );
};

export const useDashboardLanguage = () => useContext(DashboardLanguageContext);
