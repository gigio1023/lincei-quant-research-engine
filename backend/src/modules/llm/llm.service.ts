import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import * as nunjucks from 'nunjucks';
import { join, resolve } from 'path';
import { existsSync } from 'fs';

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
    const templatesPath = this.resolveTemplatesPath();
    this.nunjucksEnv = nunjucks.configure(templatesPath, { autoescape: false });

    this.validateTemplates(templatesPath);
    const openaiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    }

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
          'LLM client is not configured. Returning the default analysis message.',
        );
        return this.getDefaultAnalysisMessage(prompt);
      }

      this.logger.log(
        `Starting investment analysis with ${useGemini ? 'Gemini' : 'OpenAI'} model ${model} (attempt ${retryCount + 1})`,
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
        throw new Error('Generated analysis content is too short.');
      }

      this.logger.log('Investment analysis generation completed.');
      return result;
    } catch (error) {
      this.logger.error(
        `LLM API error (attempt ${retryCount + 1}):`,
        error.message,
      );

      if (error.status === 429 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount) * 1000;
        this.logger.warn(`Rate limit reached; retrying after ${waitTime}ms.`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.generateInvestmentAnalysis(
          prompt,
          useGemini,
          retryCount + 1,
        );
      }

      if (error.status === 503 && retryCount < maxRetries) {
        const waitTime = Math.pow(2, retryCount + 1) * 1000;
        this.logger.warn(
          `LLM service overloaded; retrying after ${waitTime}ms.`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return this.generateInvestmentAnalysis(
          prompt,
          useGemini,
          retryCount + 1,
        );
      }

      if (useGemini && this.openai && retryCount === 0) {
        this.logger.warn('Gemini failed; trying OpenAI fallback once.');
        return this.generateInvestmentAnalysis(prompt, false, 0);
      }

      if (retryCount >= maxRetries) {
        this.logger.error('All LLM retries failed; returning default message.');
        return this.getDefaultAnalysisMessage(prompt);
      }

      throw new Error('Investment analysis generation failed.');
    }
  }

  private getDefaultAnalysisMessage(_prompt: string): string {
    const today = new Date().toLocaleDateString('ko-KR');

    try {
      return this.nunjucksEnv.render('default_analysis.j2', { today });
    } catch (error) {
      this.logger.error(
        'Template rendering failed for default_analysis.j2:',
        error,
      );
      return `# ${today} 투자 분석 리포트

## ⚠️ 시스템 알림
현재 AI 분석 서비스에 일시적인 문제가 발생하여 자동 분석을 완료할 수 없습니다.

## 📊 기본 투자 가이드라인
27세 가치 투자자를 위한 기본 원칙:
1. 장기 투자 관점 유지 (3-5년 이상)
2. 안전 마진 확보
3. 포트폴리오 분산
4. 인플레이션 헤지

*시스템 복구 후 상세한 분석을 제공하겠습니다.*`;
    }
  }

  async summarizeNews(newsItems: any[]): Promise<string> {
    if (!newsItems || newsItems.length === 0) {
      return '분석할 새로운 뉴스가 없습니다.';
    }

    try {
      const prompt = this.nunjucksEnv.render('news_analysis.j2', { newsItems });
      return this.generateInvestmentAnalysis(prompt);
    } catch (error) {
      this.logger.error(
        'Template rendering failed for news_analysis.j2:',
        error,
      );
      const newsText = newsItems
        .map(
          (item) =>
            `제목: ${item.title}\n내용: ${item.content}\n출처: ${item.source}`,
        )
        .join('\n\n---\n\n');
      const fallbackPrompt = `다음 ${newsItems.length}개의 뉴스를 27세 가치 투자자 관점에서 분석해주세요:\n\n${newsText}`;
      return this.generateInvestmentAnalysis(fallbackPrompt);
    }
  }

  private getSystemPrompt(): string {
    try {
      return this.nunjucksEnv.render('system_prompt.j2');
    } catch (error) {
      this.logger.error(
        'Template rendering failed for system_prompt.j2:',
        error,
      );
      return `당신은 27세 개인 투자자를 위한 전문적인 투자 분석가입니다.

## 투자자 프로필
- 나이: 27세 (젊은 투자자)
- 투자 성향: 안전한 가치 투자 중심
- 투자 목표: 인플레이션 대비 + 장기 자산 증식
- 투자 기간: 중장기 투자 (단타 투자 배제)

## 핵심 투자 철학
1. 가치 투자 우선: 내재 가치 대비 저평가된 자산 선별
2. 안전 마진 확보: 보수적이고 신중한 투자 접근
3. 장기적 관점: 최소 3-5년 이상의 투자 기간 고려
4. 인플레이션 헤지: 실질 구매력 보호 및 증대
5. 포트폴리오 다각화: 시간대별, 자산별, 지역별 분산

분석 시 항상 "27세 가치 투자자"의 관점을 유지하고, 장기적 자산 증식과 인플레이션 대비를 염두에 두고 조언해주세요.`;
    }
  }

  private validateTemplates(templatesPath: string): void {
    const requiredTemplates = [
      'default_analysis.j2',
      'news_analysis.j2',
      'system_prompt.j2',
    ];

    const missingTemplates = requiredTemplates.filter((template) => {
      const templatePath = join(templatesPath, template);
      return !existsSync(templatePath);
    });

    if (missingTemplates.length > 0) {
      this.logger.warn(
        `Missing template files: ${missingTemplates.join(', ')}. Fallback mechanisms will be used.`,
      );
    } else {
      this.logger.log('All required template files found');
    }
  }

  private resolveTemplatesPath(): string {
    const candidates = [
      join(__dirname, '..', '..', 'templates'),
      resolve(process.cwd(), 'src/templates'),
      resolve(process.cwd(), 'dist/src/templates'),
      resolve(process.cwd(), 'dist/templates'),
    ];
    return (
      candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
    );
  }
}
