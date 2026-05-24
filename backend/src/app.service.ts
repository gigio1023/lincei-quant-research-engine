import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

type HealthStatus = {
  status: 'ok' | 'error';
  info: Record<string, Record<string, unknown>>;
  details: Record<string, Record<string, unknown>>;
};

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  getHello(): string {
    return 'Investment Helper API is running!';
  }

  async getHealthStatus(): Promise<any> {
    const healthStatus: HealthStatus = {
      status: 'ok',
      info: {},
      details: {},
    };

    try {
      await this.dataSource.query('SELECT 1');
      healthStatus.info['database'] = { status: 'up' };
      healthStatus.details['database'] = { status: 'up' };
    } catch (error) {
      healthStatus.status = 'error';
      healthStatus.info['database'] = { status: 'down' };
      healthStatus.details['database'] = {
        status: 'down',
        error: error.message,
      };
    }

    const openaiConfigured = this.hasConfiguredKey('OPENAI_API_KEY');
    const geminiConfigured = this.hasConfiguredKey('GEMINI_API_KEY');
    healthStatus.info['llm'] = {
      status: openaiConfigured || geminiConfigured ? 'configured' : 'optional',
    };
    healthStatus.details['llm'] = {
      status: openaiConfigured || geminiConfigured ? 'configured' : 'optional',
      openaiConfigured,
      geminiConfigured,
      note: 'LLM credentials are optional for numeric-only local strategy backtests.',
    };

    return healthStatus;
  }

  private hasConfiguredKey(name: string): boolean {
    const value = this.configService.get<string>(name);
    return Boolean(value && !value.startsWith('your_'));
  }
}
