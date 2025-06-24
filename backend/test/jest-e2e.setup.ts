import { randomBytes, createHash } from 'crypto';

// Polyfill crypto for Node.js test environment
if (!globalThis.crypto) {
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array) => {
      const buffer = randomBytes(arr.length);
      arr.set(buffer);
      return arr;
    },
    randomUUID: () => {
      return randomBytes(16).toString('hex');
    },
    subtle: {} as any,
  } as any;
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Mock LLM Service to prevent actual API calls
jest.mock('../src/modules/llm/llm.service', () => {
  return {
    LlmService: jest.fn().mockImplementation(() => ({
      generateInvestmentAnalysis: jest.fn().mockResolvedValue(`
        ## 📊 투자 시장 분석 리포트

        ### 🔍 주요 시장 동향
        - 테스트 환경에서 생성된 모의 투자 분석입니다
        - 현재 시장은 안정적인 모습을 보이고 있습니다
        - 주요 섹터별 전망이 긍정적입니다

        ### 💼 투자 추천
        1. **안전 자산**: 정부채권, 우량 기업 채권
        2. **성장 자산**: 기술주, 헬스케어 섹터
        3. **배당 자산**: 유틸리티, 리츠

        ### ⚠️ 리스크 요인
        - 인플레이션 압력
        - 지정학적 불안정성
        - 금리 변동성

        ### 📈 결론
        현재 시장 상황에서는 균형 잡힌 포트폴리오 구성이 중요합니다.
        테스트 환경에서 생성된 분석이므로 실제 투자 결정에 사용하지 마세요.
      `),
      summarizeNews: jest.fn().mockResolvedValue(`
        ## 📰 뉴스 요약 분석

        ### 주요 뉴스 요약
        - 테스트 환경에서 생성된 뉴스 요약입니다
        - 총 3건의 뉴스가 분석되었습니다
        - 시장에 미치는 영향은 제한적으로 평가됩니다

        ### 핵심 포인트
        1. 경제 지표 발표 예정
        2. 기업 실적 시즌 진행 중
        3. 정책 변화 모니터링 필요

        ### 투자자 관점
        현재 뉴스 동향은 중성적 영향으로 판단됩니다.
      `),
    })),
    LlmModel: {
      GEMINI_2_5_PRO_PREVIEW: 'gemini-2.5-pro-preview-06-05',
      GPT_4_1_NANO: 'gpt-4.1-nano',
    },
  };
});
