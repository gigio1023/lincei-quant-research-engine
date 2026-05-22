import { Module } from '@nestjs/common';
import { RiskGateController } from './risk-gate.controller';
import { RiskGateService } from './risk-gate.service';

@Module({
  controllers: [RiskGateController],
  providers: [RiskGateService],
  exports: [RiskGateService],
})
export class RiskGateModule {}
