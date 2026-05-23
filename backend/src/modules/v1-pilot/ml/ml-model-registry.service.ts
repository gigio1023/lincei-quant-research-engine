import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { MlModelRegistryRecord } from './ml-model-registry.types';

@Injectable()
export class MlModelRegistryService {
  private readonly logger = new Logger(MlModelRegistryService.name);
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
    if (registry.configPath) {
      const configPath = join(this.repoRoot, registry.configPath);
      if (!existsSync(configPath)) {
        return null;
      }
    }
    if (
      registry.source === 'external-download' &&
      this.isLocalOnlyJoblibArtifact(registry.artifactPath)
    ) {
      this.logger.warn(
        `External-download model ${registry.modelName} cannot use local-only joblib/pickle artifacts.`,
      );
      return null;
    }
    if (!this.verifyArtifactHash(artifactPath, registry.modelHash, registry.modelName)) {
      return null;
    }
    return registry;
  }

  /** SHA-256 of raw artifact bytes; must match registry `modelHash` before inference. */
  hashArtifactFile(artifactPath: string): string {
    const content = readFileSync(artifactPath);
    return `sha256:${createHash('sha256').update(content).digest('hex')}`;
  }

  verifyArtifactHash(
    artifactPath: string,
    expectedHash: string,
    modelName = 'unknown',
  ): boolean {
    if (!expectedHash?.startsWith('sha256:')) {
      this.logger.warn(`Registry model ${modelName} missing valid modelHash.`);
      return false;
    }
    const actualHash = this.hashArtifactFile(artifactPath);
    if (actualHash !== expectedHash) {
      this.logger.warn(
        `Model hash mismatch for ${modelName}: expected ${expectedHash}, got ${actualHash}.`,
      );
      return false;
    }
    return true;
  }

  isLocalOnlyJoblibArtifact(artifactPath: string): boolean {
    return /\.(joblib|pkl|pickle)$/i.test(artifactPath);
  }
}
