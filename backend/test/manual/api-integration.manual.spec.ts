import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { LlmService } from '../../src/modules/llm/llm.service';

/**
 * MANUAL INTEGRATION TESTS FOR ACTUAL API CALLS
 * 
 * ⚠️ WARNING: These tests make REAL API calls and incur costs!
 * 
 * Only 2 essential tests to minimize costs:
 * 1. Basic API connectivity check
 * 2. Simple prompt-response validation
 * 
 * To run: npm run test:manual
 */
describe('API Integration Tests (MANUAL)', () => {
  let app: INestApplication;
  let llmService: LlmService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    llmService = moduleFixture.get<LlmService>(LlmService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should connect to Gemini API successfully', async () => {
    console.log('🤖 Testing Gemini API connection...');
    
    const testPrompt = '1+1은?';
    
    const response = await llmService.generateInvestmentAnalysis(testPrompt);
    
    // Just verify we got ANY response
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    
    console.log('✅ API responded successfully');
  }, 30000);

  it('should generate investment-related content', async () => {
    console.log('📈 Testing investment content generation...');
    
    // Wait to avoid rate limit
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const investmentPrompt = '오늘의 투자 팁 하나만 알려주세요.';
    
    const response = await llmService.generateInvestmentAnalysis(investmentPrompt);
    
    // Just verify we got a response
    expect(response).toBeDefined();
    expect(response).toContain('투자'); // Should contain the word "investment" in Korean
    
    console.log('✅ Investment content generated successfully');
  }, 30000);
});