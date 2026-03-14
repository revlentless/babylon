/**
 * JSON Agent Adapter
 */

import type {
  AgentLogRecord,
  AgentMessageRecord,
  AgentPointsTransactionRecord,
  AgentPort,
} from '../../../ports/agents';
import type {
  AgentConfigRecord,
  AgentTradeRecord,
  PaginationOptions,
} from '../../../types';
import type { JsonIdGenerator } from '../id-generator';
import { queryArray } from '../query-utils';
import type { JsonStorageState } from '../types';

export class JsonAgentAdapter implements AgentPort {
  constructor(
    private state: JsonStorageState,
    private idGen: JsonIdGenerator,
    private onChange: () => void
  ) {}

  async getAgentConfig(userId: string): Promise<AgentConfigRecord | null> {
    return this.state.agentConfigs[userId] ?? null;
  }

  async createAgentConfig(
    config: Omit<AgentConfigRecord, 'updatedAt'>
  ): Promise<AgentConfigRecord> {
    const now = new Date();
    const record: AgentConfigRecord = {
      ...config,
      updatedAt: now,
    };
    this.state.agentConfigs[config.userId] = record;
    this.onChange();
    return record;
  }

  async updateAgentConfig(
    userId: string,
    updates: Partial<AgentConfigRecord>
  ): Promise<AgentConfigRecord> {
    const existing = this.state.agentConfigs[userId];
    if (!existing) {
      throw new Error(`Agent config not found: ${userId}`);
    }

    const updated: AgentConfigRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.state.agentConfigs[userId] = updated;
    this.onChange();
    return updated;
  }

  async deleteAgentConfig(userId: string): Promise<void> {
    delete this.state.agentConfigs[userId];
    this.onChange();
  }

  async getAgentLogs(
    agentUserId: string,
    options?: PaginationOptions & { type?: string; level?: string }
  ): Promise<AgentLogRecord[]> {
    return queryArray(
      this.state.agentLogs,
      (l) =>
        l.agentUserId === agentUserId &&
        (!options?.type || l.type === options.type) &&
        (!options?.level || l.level === options.level),
      {
        sortBy: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        limit: options?.limit ?? 100,
        offset: options?.offset ?? 0,
      }
    );
  }

  async createAgentLog(
    log: Omit<AgentLogRecord, 'id' | 'createdAt'>
  ): Promise<AgentLogRecord> {
    const record: AgentLogRecord = {
      ...log,
      id: this.idGen.generate('log'),
      createdAt: new Date(),
    };
    this.state.agentLogs.push(record);
    this.onChange();
    return record;
  }

  async getAgentMessages(
    agentUserId: string,
    limit = 50
  ): Promise<AgentMessageRecord[]> {
    return queryArray(
      this.state.agentMessages,
      (m) => m.agentUserId === agentUserId,
      {
        sortBy: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        limit,
      }
    );
  }

  async createAgentMessage(
    message: Omit<AgentMessageRecord, 'id' | 'createdAt'>
  ): Promise<AgentMessageRecord> {
    const record: AgentMessageRecord = {
      ...message,
      id: this.idGen.generate('message'),
      createdAt: new Date(),
    };
    this.state.agentMessages.push(record);
    this.onChange();
    return record;
  }

  async getAgentPointsTransactions(
    agentUserId: string,
    limit = 100
  ): Promise<AgentPointsTransactionRecord[]> {
    return queryArray(
      this.state.agentPointsTransactions,
      (t) => t.agentUserId === agentUserId,
      {
        sortBy: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        limit,
      }
    );
  }

  async createAgentPointsTransaction(
    transaction: Omit<AgentPointsTransactionRecord, 'id' | 'createdAt'>
  ): Promise<AgentPointsTransactionRecord> {
    const record: AgentPointsTransactionRecord = {
      ...transaction,
      id: this.idGen.generate('transaction'),
      createdAt: new Date(),
    };
    this.state.agentPointsTransactions.push(record);
    this.onChange();
    return record;
  }

  async getAgentTrades(
    agentUserId: string,
    limit = 100
  ): Promise<AgentTradeRecord[]> {
    return queryArray(
      this.state.agentTrades,
      (t) => t.agentUserId === agentUserId,
      {
        sortBy: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        limit,
      }
    );
  }

  async createAgentTrade(
    trade: Omit<AgentTradeRecord, 'id' | 'createdAt'>
  ): Promise<AgentTradeRecord> {
    const record: AgentTradeRecord = {
      ...trade,
      id: this.idGen.generate('trade'),
      createdAt: new Date(),
    };
    this.state.agentTrades.push(record);
    this.onChange();
    return record;
  }

  async listAgentsWithAutonomousTrading(): Promise<AgentConfigRecord[]> {
    return Object.values(this.state.agentConfigs).filter(
      (c) => c.autonomousTrading
    );
  }
}
