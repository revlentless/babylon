/**
 * JSON Storage Provider Tests
 *
 * Tests the JSON-based storage implementation for simulation/training.
 */

import { beforeEach, describe, expect, test } from 'vitest';
import { JsonStorageProvider } from '../adapters/json';

let testCounter = 0;

describe('JsonStorageProvider', () => {
  let provider: JsonStorageProvider;

  beforeEach(async () => {
    testCounter++;
    provider = new JsonStorageProvider({
      mode: 'json',
      jsonBasePath: `/tmp/babylon-test-${Date.now()}-${testCounter}`,
      persistOnChange: false, // Don't persist in tests
    });
    await provider.initialize();
  });

  describe('Game Port', () => {
    test('initializes game state', async () => {
      const game = await provider.game.initializeGame();

      expect(game).toBeDefined();
      expect(game.id).toBeDefined();
      expect(game.isContinuous).toBe(true);
      expect(game.isRunning).toBe(true);
    });

    test('returns existing game on re-initialization', async () => {
      const game1 = await provider.game.initializeGame();
      const game2 = await provider.game.initializeGame();

      expect(game1.id).toBe(game2.id);
    });

    test('updates game state', async () => {
      await provider.game.initializeGame();

      const updated = await provider.game.updateGameState({
        currentDay: 5,
        isRunning: false,
      });

      expect(updated.currentDay).toBe(5);
      expect(updated.isRunning).toBe(false);
    });

    test('creates and retrieves events', async () => {
      const event = await provider.game.createEvent({
        id: 'test-event-1',
        eventType: 'earnings_report',
        description: 'Test company releases earnings',
        actors: ['actor-1', 'actor-2'],
        visibility: 'public',
        pointsToward: 'YES',
        relatedQuestion: 1,
        dayNumber: 1,
      });

      expect(event.id).toBe('test-event-1');
      expect(event.timestamp).toBeInstanceOf(Date);

      const events = await provider.game.getRecentEvents(10);
      expect(events.length).toBe(1);
      expect(events[0]!.id).toBe('test-event-1');
    });
  });

  describe('Actor Port', () => {
    test('upserts and retrieves actor state', async () => {
      const state = await provider.actors.upsertActorState({
        id: 'test-actor',
        tradingBalance: '50000',
        reputationPoints: 15000,
        hasPool: true,
      });

      expect(state.id).toBe('test-actor');
      expect(state.tradingBalance).toBe('50000');
      expect(state.reputationPoints).toBe(15000);
      expect(state.hasPool).toBe(true);

      const retrieved = await provider.actors.getActorState('test-actor');
      expect(retrieved).toEqual(state);
    });

    test('updates actor balance', async () => {
      await provider.actors.upsertActorState({
        id: 'test-actor',
        tradingBalance: '10000',
        reputationPoints: 10000,
        hasPool: false,
      });

      await provider.actors.updateActorBalance('test-actor', 25000);

      const state = await provider.actors.getActorState('test-actor');
      expect(state?.tradingBalance).toBe('25000');
    });
  });

  describe('Post Port', () => {
    test('creates and retrieves posts', async () => {
      const post = await provider.posts.createPost({
        id: 'post-1',
        type: 'post',
        content: 'Test post content',
        authorId: 'author-1',
        timestamp: new Date(),
      });

      expect(post.id).toBe('post-1');
      expect(post.likeCount).toBe(0);
      expect(post.commentCount).toBe(0);

      const retrieved = await provider.posts.getPost('post-1');
      expect(retrieved?.content).toBe('Test post content');
    });

    test('increments like count', async () => {
      await provider.posts.createPost({
        id: 'post-2',
        type: 'post',
        content: 'Likeable post',
        authorId: 'author-1',
        timestamp: new Date(),
      });

      await provider.posts.incrementLikeCount('post-2');
      await provider.posts.incrementLikeCount('post-2');

      const post = await provider.posts.getPost('post-2');
      expect(post?.likeCount).toBe(2);
    });

    test('paginates recent posts', async () => {
      for (let i = 0; i < 5; i++) {
        await provider.posts.createPost({
          id: `post-${i}`,
          type: 'post',
          content: `Post ${i}`,
          authorId: 'author-1',
          timestamp: new Date(Date.now() + i * 1000),
        });
      }

      const page1 = await provider.posts.getRecentPosts({ limit: 2 });
      expect(page1.items.length).toBe(2);
      expect(page1.hasMore).toBe(true);

      const page2 = await provider.posts.getRecentPosts({
        limit: 2,
        offset: 2,
      });
      expect(page2.items.length).toBe(2);
    });
  });

  describe('Question Port', () => {
    test('creates and retrieves questions', async () => {
      const question = await provider.questions.createQuestion({
        questionNumber: 1,
        text: 'Will the test pass?',
        scenarioId: 1,
        outcome: false,
        rank: 1,
        status: 'active',
        resolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      expect(question.id).toBeDefined();
      expect(question.text).toBe('Will the test pass?');
      expect(question.status).toBe('active');
    });

    test('resolves question', async () => {
      const question = await provider.questions.createQuestion({
        questionNumber: 2,
        text: 'Another test question',
        scenarioId: 1,
        outcome: false,
        rank: 1,
        status: 'active',
        resolutionDate: new Date(),
      });

      const resolved = await provider.questions.resolveQuestion(
        question.id,
        true
      );
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedOutcome).toBe(true);
    });

    test('gets active questions', async () => {
      await provider.questions.createQuestion({
        questionNumber: 3,
        text: 'Active question',
        scenarioId: 1,
        outcome: false,
        rank: 1,
        status: 'active',
        resolutionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const active = await provider.questions.getActiveQuestions();
      expect(active.length).toBe(1);
    });
  });

  describe('Market Port', () => {
    test('creates and retrieves markets', async () => {
      const market = await provider.markets.createMarket({
        id: 'market-1',
        title: 'Test Market',
        description: 'A test prediction market',
        category: 'test',
        yesShares: '10000',
        noShares: '10000',
        liquidity: '20000',
        resolved: false,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      expect(market.id).toBe('market-1');
      expect(market.title).toBe('Test Market');

      const retrieved = await provider.markets.getMarket('market-1');
      expect(retrieved?.title).toBe('Test Market');
    });

    test('gets active markets', async () => {
      await provider.markets.createMarket({
        id: 'market-2',
        title: 'Active Market',
        yesShares: '10000',
        noShares: '10000',
        liquidity: '20000',
        resolved: false,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const active = await provider.markets.getActiveMarkets();
      expect(active.length).toBe(1);
    });

    test('resolves market', async () => {
      await provider.markets.createMarket({
        id: 'market-3',
        title: 'Resolvable Market',
        yesShares: '10000',
        noShares: '10000',
        liquidity: '20000',
        resolved: false,
        endDate: new Date(),
      });

      await provider.markets.resolveMarket('market-3', true);

      const market = await provider.markets.getMarket('market-3');
      expect(market?.resolved).toBe(true);
      expect(market?.outcome).toBe(true);
    });
  });

  describe('Trading Port', () => {
    test('creates and retrieves positions', async () => {
      const position = await provider.trading.createPosition({
        id: 'position-1',
        poolId: 'pool-1',
        marketType: 'prediction',
        marketId: 'market-1',
        side: 'YES',
        entryPrice: 0.55,
        currentPrice: 0.55,
        size: 1000,
        shares: 1818,
        unrealizedPnL: 0,
      });

      expect(position.id).toBe('position-1');

      const retrieved = await provider.trading.getPosition('position-1');
      expect(retrieved?.side).toBe('YES');
    });

    test('closes position', async () => {
      await provider.trading.createPosition({
        id: 'position-2',
        poolId: 'pool-1',
        marketType: 'prediction',
        marketId: 'market-1',
        side: 'YES',
        entryPrice: 0.5,
        currentPrice: 0.6,
        size: 1000,
        shares: 2000,
        unrealizedPnL: 200,
      });

      const closed = await provider.trading.closePosition('position-2', 200);
      expect(closed.closedAt).toBeInstanceOf(Date);
      expect(closed.realizedPnL).toBe(200);
      expect(closed.unrealizedPnL).toBe(0);
    });

    test('creates NPC trades', async () => {
      const trade = await provider.trading.createNpcTrade({
        npcActorId: 'npc-1',
        marketType: 'prediction',
        marketId: 'market-1',
        action: 'buy_yes',
        side: 'YES',
        amount: 1000,
        price: 0.55,
        sentiment: 0.8,
        reason: 'Bullish outlook',
      });

      expect(trade.id).toBeDefined();
      expect(trade.npcActorId).toBe('npc-1');

      const trades = await provider.trading.getNpcTrades('npc-1');
      expect(trades.length).toBe(1);
    });
  });

  describe('User Port', () => {
    test('creates and retrieves users', async () => {
      const user = await provider.users.createUser({
        id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        isAgent: false,
        virtualBalance: '10000',
        totalDeposited: '0',
        reputationPoints: 1000,
        lifetimePnL: '0',
      });

      expect(user.id).toBe('user-1');
      expect(user.username).toBe('testuser');

      const retrieved = await provider.users.getUser('user-1');
      expect(retrieved?.displayName).toBe('Test User');
    });

    test('finds user by username', async () => {
      await provider.users.createUser({
        id: 'user-2',
        username: 'findme',
        isAgent: false,
        virtualBalance: '10000',
        totalDeposited: '0',
        reputationPoints: 1000,
        lifetimePnL: '0',
      });

      const found = await provider.users.getUserByUsername('findme');
      expect(found?.id).toBe('user-2');
    });

    test('gets agent users', async () => {
      await provider.users.createUser({
        id: 'agent-1',
        username: 'agent_test',
        isAgent: true,
        managedBy: 'user-1',
        virtualBalance: '5000',
        totalDeposited: '5000',
        reputationPoints: 500,
        lifetimePnL: '0',
      });

      const agents = await provider.users.getAgentUsers();
      expect(agents.length).toBe(1);
      expect(agents[0]!.isAgent).toBe(true);
    });
  });

  describe('Agent Port', () => {
    test('creates and retrieves agent config', async () => {
      const config = await provider.agents.createAgentConfig({
        id: 'config-1',
        userId: 'agent-1',
        systemPrompt: 'You are a helpful trading agent',
        personality: 'aggressive',
        autonomousTrading: true,
        autonomousPosting: false,
        autonomousCommenting: false,
        autonomousDMs: false,
        autonomousGroupChats: false,
        a2aEnabled: true,
        modelTier: 'pro',
      });

      expect(config.id).toBe('config-1');
      expect(config.autonomousTrading).toBe(true);

      const retrieved = await provider.agents.getAgentConfig('agent-1');
      expect(retrieved?.personality).toBe('aggressive');
    });

    test('lists agents with autonomous trading', async () => {
      await provider.agents.createAgentConfig({
        id: 'config-2',
        userId: 'agent-2',
        autonomousTrading: true,
        autonomousPosting: false,
        autonomousCommenting: false,
        autonomousDMs: false,
        autonomousGroupChats: false,
        a2aEnabled: true,
        modelTier: 'free',
      });

      await provider.agents.createAgentConfig({
        id: 'config-3',
        userId: 'agent-3',
        autonomousTrading: false,
        autonomousPosting: true,
        autonomousCommenting: false,
        autonomousDMs: false,
        autonomousGroupChats: false,
        a2aEnabled: false,
        modelTier: 'free',
      });

      const autonomousTraders =
        await provider.agents.listAgentsWithAutonomousTrading();
      expect(autonomousTraders.length).toBe(1);
      expect(autonomousTraders[0]!.userId).toBe('agent-2');
    });

    test('creates agent logs', async () => {
      const log = await provider.agents.createAgentLog({
        agentUserId: 'agent-1',
        type: 'trade',
        level: 'info',
        message: 'Executed buy order',
        metadata: { marketId: 'market-1', amount: 1000 },
      });

      expect(log.id).toBeDefined();
      expect(log.type).toBe('trade');

      const logs = await provider.agents.getAgentLogs('agent-1');
      expect(logs.length).toBe(1);
    });
  });

  describe('Error Paths', () => {
    test('throws when updating a non-existent pool', async () => {
      await expect(
        provider.trading.updatePool('nonexistent-pool', { totalValue: 999 })
      ).rejects.toThrow('Pool not found: nonexistent-pool');
    });

    test('throws when updating a non-existent position', async () => {
      await expect(
        provider.trading.updatePosition('nonexistent-pos', {
          currentPrice: 0.7,
        })
      ).rejects.toThrow('Position not found: nonexistent-pos');
    });

    test('throws when closing a non-existent position', async () => {
      await expect(
        provider.trading.closePosition('nonexistent-pos', 100)
      ).rejects.toThrow('Position not found: nonexistent-pos');
    });

    test('throws when updating a non-existent market', async () => {
      await expect(
        provider.markets.updateMarket('nonexistent-market', {
          title: 'Updated',
        })
      ).rejects.toThrow('Market not found: nonexistent-market');
    });

    test('throws when resolving a non-existent market', async () => {
      await expect(
        provider.markets.resolveMarket('nonexistent-market', true)
      ).rejects.toThrow('Market not found: nonexistent-market');
    });

    test('throws when updating shares on a non-existent market', async () => {
      await expect(
        provider.markets.updateMarketShares(
          'nonexistent-market',
          '100',
          '100',
          '200'
        )
      ).rejects.toThrow('Market not found: nonexistent-market');
    });

    test('throws when updating a non-existent post', async () => {
      await expect(
        provider.posts.updatePost('nonexistent-post', { content: 'Updated' })
      ).rejects.toThrow('Post not found: nonexistent-post');
    });

    test('throws when resolving a non-existent question', async () => {
      await expect(
        provider.questions.resolveQuestion('nonexistent-question', true)
      ).rejects.toThrow('Question not found: nonexistent-question');
    });

    test('silently no-ops when deleting a non-existent post', async () => {
      // deletePost does not throw for missing posts; it just does nothing
      await provider.posts.deletePost('nonexistent-post');
      const post = await provider.posts.getPost('nonexistent-post');
      expect(post).toBeNull();
    });

    test('silently no-ops when updating balance of non-existent actor', async () => {
      // updateActorBalance does not throw for missing actors
      await provider.actors.updateActorBalance('nonexistent-actor', 5000);
      const state = await provider.actors.getActorState('nonexistent-actor');
      expect(state).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    test('soft-deletes a post and excludes it from recent posts', async () => {
      await provider.posts.createPost({
        id: 'delete-me',
        type: 'post',
        content: 'This will be deleted',
        authorId: 'author-1',
        timestamp: new Date(),
      });

      await provider.posts.deletePost('delete-me');

      const recent = await provider.posts.getRecentPosts();
      expect(recent.items.find((p) => p.id === 'delete-me')).toBeUndefined();

      // The raw record still exists but has deletedAt set
      const raw = await provider.posts.getPost('delete-me');
      expect(raw).toBeDefined();
      expect(raw?.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe('Snapshot Roundtrip', () => {
    test('saves and loads snapshot preserving all data', async () => {
      // Populate state with data across multiple ports
      await provider.game.initializeGame();
      await provider.actors.upsertActorState({
        id: 'snapshot-actor',
        tradingBalance: '77777',
        reputationPoints: 5000,
        hasPool: true,
      });
      await provider.markets.createMarket({
        id: 'snapshot-market',
        title: 'Snapshot Market',
        yesShares: '1000',
        noShares: '1000',
        liquidity: '2000',
        resolved: false,
        endDate: new Date(Date.now() + 86400000),
      });
      await provider.posts.createPost({
        id: 'snapshot-post',
        type: 'post',
        content: 'Snapshot content',
        authorId: 'snapshot-actor',
        timestamp: new Date(),
      });

      // Save snapshot via exportToJson
      const { mkdirSync } = await import('node:fs');
      const snapshotDir = '/tmp/babylon-snapshot-src-' + Date.now();
      mkdirSync(snapshotDir, { recursive: true });
      await provider.exportToJson(snapshotDir);

      // Create a fresh provider that loads the exported snapshot at init time
      // by placing the export file as the basePath's state.json
      const { copyFileSync } = await import('node:fs');
      const newBasePath =
        '/tmp/babylon-snapshot-test-' + Date.now() + '-' + testCounter;
      mkdirSync(newBasePath, { recursive: true });
      copyFileSync(
        snapshotDir + '/export.json',
        newBasePath + '/state.json'
      );

      const provider2 = new JsonStorageProvider({
        mode: 'json',
        jsonBasePath: newBasePath,
        persistOnChange: false,
      });
      // initialize() reads state.json and calls mergeState before adapters are used
      // Since constructor creates adapters with the initial empty state,
      // and initialize replaces this.state, we verify via getState()
      await provider2.initialize();

      const loadedState = provider2.getState();

      // Verify actor state
      expect(loadedState.actorStates['snapshot-actor']).toBeDefined();
      expect(loadedState.actorStates['snapshot-actor']?.tradingBalance).toBe(
        '77777'
      );
      expect(loadedState.actorStates['snapshot-actor']?.reputationPoints).toBe(
        5000
      );
      expect(loadedState.actorStates['snapshot-actor']?.hasPool).toBe(true);

      // Verify market
      expect(loadedState.markets['snapshot-market']).toBeDefined();
      expect(loadedState.markets['snapshot-market']?.title).toBe(
        'Snapshot Market'
      );

      // Verify post
      expect(loadedState.posts['snapshot-post']).toBeDefined();
      expect(loadedState.posts['snapshot-post']?.content).toBe(
        'Snapshot content'
      );

      // Verify game state was loaded
      expect(loadedState.game).toBeDefined();
      expect(loadedState.game?.isRunning).toBe(true);
    });

    test('saveSnapshot persists counters for ID generation', async () => {
      // Create entities to bump counters
      await provider.questions.createQuestion({
        questionNumber: 1,
        text: 'Counter persistence test',
        scenarioId: 1,
        outcome: false,
        rank: 1,
        status: 'active',
        resolutionDate: new Date(Date.now() + 86400000),
      });

      await provider.saveSnapshot();
      const state = provider.getState();

      // Counters should be persisted and non-zero
      expect(state.counters.question).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    test('mergeState applies loaded data and adapters see updates', async () => {
      // Create some initial data
      await provider.actors.upsertActorState({
        id: 'merge-actor-1',
        tradingBalance: '10000',
        reputationPoints: 100,
        hasPool: false,
      });

      // Build a state object to merge in
      const stateToMerge = provider.getState();

      // Modify it externally
      stateToMerge.actorStates['merge-actor-2'] = {
        id: 'merge-actor-2',
        tradingBalance: '25000',
        reputationPoints: 500,
        hasPool: true,
        updatedAt: new Date(),
      };

      // Merge via setState
      provider.setState(stateToMerge);

      // Both actors should be visible through the adapter
      const actor1 = await provider.actors.getActorState('merge-actor-1');
      expect(actor1).toBeDefined();
      expect(actor1?.tradingBalance).toBe('10000');

      const actor2 = await provider.actors.getActorState('merge-actor-2');
      expect(actor2).toBeDefined();
      expect(actor2?.tradingBalance).toBe('25000');
      expect(actor2?.hasPool).toBe(true);
    });

    test('mergeState preserves metadata and counters', async () => {
      // Create data that bumps counters
      await provider.questions.createQuestion({
        questionNumber: 99,
        text: 'Counter test',
        scenarioId: 1,
        outcome: false,
        rank: 1,
        status: 'active',
        resolutionDate: new Date(Date.now() + 86400000),
      });

      // Save and reload via snapshot to exercise counter persistence
      await provider.saveSnapshot();
      const state = provider.getState();

      expect(state.counters.question).toBeGreaterThan(0);
      expect(state.metadata.version).toBe('1.0.0');
    });

    test('getState returns live state reflecting adapter writes', async () => {
      await provider.users.createUser({
        id: 'state-user',
        username: 'statecheck',
        isAgent: false,
        virtualBalance: '1000',
        totalDeposited: '0',
        reputationPoints: 0,
        lifetimePnL: '0',
      });

      const state = provider.getState();
      expect(state.users['state-user']).toBeDefined();
      expect(state.users['state-user']?.username).toBe('statecheck');
    });
  });

  describe('Temp Directory Cleanup', () => {
    test('shutdown calls saveSnapshot without error', async () => {
      await provider.game.initializeGame();
      // shutdown should save state without throwing
      await provider.shutdown();

      // isHealthy should still return true (initialized flag not cleared)
      const healthy = await provider.isHealthy();
      expect(healthy).toBe(true);
    });
  });

  describe('Integration', () => {
    test('simulates a complete trading session', async () => {
      // Initialize game
      const game = await provider.game.initializeGame();
      expect(game.isRunning).toBe(true);

      // Create actors
      await provider.actors.upsertActorState({
        id: 'marcus-chen',
        tradingBalance: '50000',
        reputationPoints: 10000,
        hasPool: false,
      });

      // Create a market
      await provider.markets.createMarket({
        id: 'btc-100k',
        title: 'Will BTC reach $100k?',
        yesShares: '10000',
        noShares: '10000',
        liquidity: '20000',
        resolved: false,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Actor makes a trade
      await provider.trading.createNpcTrade({
        npcActorId: 'marcus-chen',
        marketType: 'prediction',
        marketId: 'btc-100k',
        action: 'buy_yes',
        side: 'YES',
        amount: 5000,
        price: 0.45,
        sentiment: 0.9,
        reason: 'Bullish on BTC adoption',
      });

      // Update market shares
      await provider.markets.updateMarketShares(
        'btc-100k',
        '15000', // More YES shares bought
        '10000',
        '25000' // More liquidity
      );

      // Create position
      await provider.trading.createPosition({
        id: 'pos-marcus-1',
        poolId: 'marcus-chen',
        marketType: 'prediction',
        marketId: 'btc-100k',
        side: 'YES',
        entryPrice: 0.45,
        currentPrice: 0.6,
        size: 5000,
        shares: 11111,
        unrealizedPnL: 1666,
      });

      // Update actor balance
      await provider.actors.updateActorBalance('marcus-chen', 45000);

      // Actor posts about their trade
      await provider.posts.createPost({
        id: 'post-marcus-1',
        type: 'post',
        content: 'Just went long on BTC $100k! 🚀 Feeling bullish!',
        authorId: 'marcus-chen',
        timestamp: new Date(),
      });

      // Create world event
      await provider.game.createEvent({
        id: 'event-1',
        eventType: 'market_movement',
        description: 'Major whale accumulation detected in BTC markets',
        actors: [],
        visibility: 'public',
        pointsToward: 'YES',
        dayNumber: 1,
      });

      // Verify state
      const actorState = await provider.actors.getActorState('marcus-chen');
      expect(actorState?.tradingBalance).toBe('45000');

      const positions = await provider.trading.getOpenPositions('marcus-chen');
      expect(positions.length).toBe(1);
      expect(positions[0]!.unrealizedPnL).toBe(1666);

      const posts = await provider.posts.getRecentPosts();
      expect(posts.items.length).toBe(1);

      const trades = await provider.trading.getNpcTrades('marcus-chen');
      expect(trades.length).toBe(1);

      const events = await provider.game.getRecentEvents();
      expect(events.length).toBe(1);

      // Get full state for inspection
      const state = provider.getState();
      console.log('\n=== Final Simulation State ===');
      console.log('Actors:', Object.keys(state.actorStates).length);
      console.log('Markets:', Object.keys(state.markets).length);
      console.log('Positions:', Object.keys(state.positions).length);
      console.log('Posts:', Object.keys(state.posts).length);
      console.log('NPC Trades:', state.npcTrades.length);
      console.log('World Events:', state.worldEvents.length);
    });
  });
});
