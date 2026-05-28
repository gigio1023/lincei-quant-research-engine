import { Body, Controller, Get, Post } from '@nestjs/common';
import { RiskGateService } from './risk-gate.service';
import type { RiskGateRequest, RiskGateResponse } from './risk-gate.types';

@Controller('risk-gate')
export class RiskGateController {
  constructor(private readonly riskGateService: RiskGateService) {}

  @Get('status')
  getStatus(): ReturnType<RiskGateService['getStatus']> {
    return this.riskGateService.getStatus();
  }

  @Post('evaluate')
  evaluate(@Body() request: RiskGateRequest): RiskGateResponse {
    return this.riskGateService.evaluate(request);
  }
}
