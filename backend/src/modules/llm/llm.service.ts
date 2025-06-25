import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as nunjucks from 'nunjucks';
import { join } from 'path';

export enum LlmModel {
  GEMINI_2_5_FLASH = 'gemini-2.5-flash',
  GEMINI_2_5_FLASH_LITE = 'gemini-2.5-flash-lite-preview-06-17',
  GPT_4_1_NANO = 'gpt-4.1-nano',
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private geminiClient: OpenAI;
  private nunjucksEnv: nunjucks.Environment;

  constructor(private configService: ConfigService) {
    const templatesPath = join(__dirname, '..', '..', 'templates');
    this.nunjucksEnv = nunjucks.configure(templatesPath, { autoescape: false });
    // OpenAI 클라이언트 (보조 모델)
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    }

    // Gemini를 OpenAI 호환 형태로 사용 (주 모델)
    const geminiKey = this.configService.get('GEMINI_API_KEY');
    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.geminiClient = new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });
    }
  }

  async generateInvestmentAnalysis(
    prompt: string,
    useGemini = true,
    retryCount = 0,
  ): Promise<string> {
    const maxRetries = 3;

    try {
      const client =
        useGemini && this.geminiClient ? this.geminiClient : this.openai;
      const model = useGemini
        ? LlmModel.GEMINI_2_5_FLASH
        : LlmModel.GPT_4_1_NANO;

      if (!client) {
        this.logger.warn(
          'LLM 클라이언트가 설정되지 않았습니다. 기본 메시지를 반환합니다.',
        );
        return this.getDefaultAnalysisMessage(prompt);
      }

      this.logger.log(
        `${useGemini ? 'Gemini' : 'OpenAI'} 모델(${model})로 투자 분석 시작 (시도: ${retryCount + 1})`,
      );

      const response = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const result = response.choices[0].message.content || '';
      if (!result || result.length < 100) {
        throw new Error('생성된 분석 내용이 너무 짧습니다.');
      }

      this.logger.log('투자 분석 생성 완료');
      return result;
    } catch (error) {
      this.logger.error(
        `LLM API 오류 (시도 ${retryCount + 1}):`,
        error.message,
      );

      // Rate limit 오류 시 대기 후 재시도
      if (error.status === 429 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000; // 지수 백오프
        this.logger.warn(`Rate limit 도달, ${waitTime}ms 대기 후 재시도`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.generateInvestmentAnalysis(
          prompt,
          useGemini,
          retryCount + 1,
        );
      }

      // 503 오류(서비스 과부하) 시에도 재시도
      if (error.status === 503 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount + 1) * 1000; // 더 긴 대기 시간
        this.logger.warn(`서비스 과부하, ${waitTime}ms 대기 후 재시도`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.generateInvestmentAnalysis(
          prompt,
          useGemini,
          retryCount + 1,
        );
      }

      // Gemini 실패 시 OpenAI로 폴백 (한 번만)
      if (useGemini && this.openai && retryCount === 0) {
        this.logger.warn('Gemini 실패, OpenAI로 폴백 시도');
        return this.generateInvestmentAnalysis(prompt, false, 0);
      }

      // 최후의 대안: 기본 메시지 반환
      if (retryCount >= maxRetries) {
        this.logger.error('모든 재시도 실패, 기본 메시지 반환');
        return this.getDefaultAnalysisMessage(prompt);
      }

      throw new Error('투자 분석 생성 중 오류가 발생했습니다.');
    }
  }

  private getDefaultAnalysisMessage(_prompt: string): string {
    const today = new Date().toLocaleDateString('ko-KR');
    return this.nunjucksEnv.render('default_analysis.j2', { today });
  }

  async summarizeNews(newsItems: any[]): Promise<string> {
    if (!newsItems || newsItems.length === 0) {
      return '분석할 새로운 뉴스가 없습니다.';
    }
    const prompt = this.nunjucksEnv.render('news_analysis.j2', { newsItems });
    return this.generateInvestmentAnalysis(prompt);
  }

  private getSystemPrompt(): string {
    return this.nunjucksEnv.render('system_prompt.j2');
  }
}
