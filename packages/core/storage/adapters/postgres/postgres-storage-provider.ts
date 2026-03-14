/**
 * PostgreSQL Storage Provider
 *
 * For production use with PostgreSQL database.
 *
 * ARCHITECTURE NOTE:
 * This provider is intentionally a thin wrapper that delegates to @babylon/db.
 * The port-based abstraction is primarily useful for:
 * - JSON mode: Simulation/training without a database
 * - Memory mode: Fast unit testing
 *
 * For production PostgreSQL access, most code uses @babylon/db directly because:
 * 1. The Drizzle ORM provides excellent type safety
 * 2. Complex queries benefit from direct SQL access
 * 3. The db client has built-in connection pooling, retries, and RLS support
 *
 * If you need the port abstraction for production, consider:
 * - Using @babylon/db directly (recommended)
 * - Implementing specific adapters as needed
 *
 * The JSON storage provider (packages/core/storage/adapters/json) provides a
 * complete implementation of all ports for offline simulation and training.
 */

import { checkDatabaseHealth, closeDatabase } from '@babylon/db';
import type { ActorPort, OrganizationPort } from '../../ports/actors';
import type { AgentPort } from '../../ports/agents';
import type { GamePort } from '../../ports/game';
import type { MarketPort } from '../../ports/markets';
import type { PostPort } from '../../ports/posts';
import type { QuestionPort } from '../../ports/questions';
import type {
  IStorageProvider,
  StorageMode,
} from '../../ports/storage-provider';
import type { TradingPort } from '../../ports/trading';
import type { UserPort } from '../../ports/users';

const NOT_IMPLEMENTED_MSG =
  'PostgresStorageProvider port methods are not implemented. ' +
  'For production, use @babylon/db directly which provides: ' +
  '• Full Drizzle ORM type safety ' +
  '• Connection pooling and retries ' +
  '• RLS context support (asUser, asSystem) ' +
  '• Direct SQL for complex queries. ' +
  'For simulation/training, use createStorageProvider({ mode: "json" }).';

/** Creates a proxy that throws NOT_IMPLEMENTED_MSG for any method call. */
function createStubPort<T extends object>(): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop === 'string') {
        return () => {
          throw new Error(NOT_IMPLEMENTED_MSG);
        };
      }
    },
  });
}

export class PostgresStorageProvider implements IStorageProvider {
  readonly mode: StorageMode = 'postgres';

  readonly actors: ActorPort = createStubPort<ActorPort>();
  readonly organizations: OrganizationPort = createStubPort<OrganizationPort>();
  readonly agents: AgentPort = createStubPort<AgentPort>();
  readonly game: GamePort = createStubPort<GamePort>();
  readonly markets: MarketPort = createStubPort<MarketPort>();
  readonly posts: PostPort = createStubPort<PostPort>();
  readonly questions: QuestionPort = createStubPort<QuestionPort>();
  readonly trading: TradingPort = createStubPort<TradingPort>();
  readonly users: UserPort = createStubPort<UserPort>();

  async initialize(): Promise<void> {
    // Verify database connection is healthy
    const healthy = await checkDatabaseHealth();
    if (!healthy) {
      throw new Error(
        'PostgresStorageProvider: Database connection failed. ' +
          'Check DATABASE_URL environment variable.'
      );
    }
  }

  async shutdown(): Promise<void> {
    await closeDatabase();
  }

  async isHealthy(): Promise<boolean> {
    return checkDatabaseHealth();
  }
}
