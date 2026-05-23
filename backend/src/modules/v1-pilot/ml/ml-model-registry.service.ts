import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { MlModelRegistryRecord } from './ml-model-registry.types';

@Injectable()
export class MlModelRegistryService {
  private readonly repoRoot = resolve(process.cwd(), '..');
  private readonly registryPath = join(this.repoRoot, 'ml/registry/model_registry.json');

  getRegistry(): MlModelRegistryRecord | null {
    if (!existsSync(this.registryPath)) {
      return null;
    }
    return JSON.parse(readFileSync(this.registryPath, 'utf8')) as MlModelRegistryRecord;
  }

  getPromotedModel(): MlModelRegistryRecord | null {
    const registry = this.getRegistry();
    if (!registry || registry.status !== 'promoted') {
      return null;
    }
    const artifactPath = join(this.repoRoot, registry.artifactPath);
    if (!existsSync(artifactPath)) {
      return null;
    }
    return registry;
  }
}
