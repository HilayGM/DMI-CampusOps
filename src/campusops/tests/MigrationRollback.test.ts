import {
  SchemaMigrationManager,
  type MigrationDatabase,
  type SchemaMigration,
} from '../infrastructure/persistence/SchemaMigrationManager';

interface MemoryDatabaseState {
  tables: Set<string>;
  columns: Map<string, Set<string>>;
  migrationVersions: number[];
  pendingOperations: { operationId: string; status: string }[];
}

class MemoryMigrationDatabase implements MigrationDatabase {
  transactionCount = 0;
  rollbackCount = 0;

  state: MemoryDatabaseState = {
    tables: new Set(['pending_operations']),
    columns: new Map([['pending_operations', new Set(['operation_id', 'status'])]]),
    migrationVersions: [],
    pendingOperations: [
      { operationId: 'operation-1', status: 'pending' },
    ],
  };

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.transactionCount += 1;
    const previousState = this.cloneState();

    try {
      await task();
    } catch (error) {
      this.state = previousState;
      this.rollbackCount += 1;
      throw error;
    }
  }

  async runAsync(sql: string): Promise<unknown> {
    const createTable = sql.match(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/i);

    if (createTable?.[1]) {
      const tableName = createTable[1];
      this.state.tables.add(tableName);
      this.state.columns.set(tableName, new Set());
      return;
    }

    const insertVersion = sql.match(
      /INSERT INTO schema_migrations \(version\) VALUES \((\d+)\)/i,
    );

    if (insertVersion?.[1]) {
      this.state.migrationVersions.push(Number(insertVersion[1]));
      return;
    }

    const alterTable = sql.match(
      /ALTER TABLE ([a-z_]+) ADD COLUMN ([a-z_]+)/i,
    );

    if (alterTable?.[1] && alterTable[2]) {
      const tableName = alterTable[1];
      const columnName = alterTable[2];
      const columns = this.state.columns.get(tableName);

      if (!columns) {
        throw new Error(`Table ${tableName} does not exist.`);
      }

      columns.add(columnName);
    }
  }

  async getAllAsync<T>(sql: string): Promise<T[]> {
    if (/SELECT\s+version\s+FROM\s+schema_migrations/i.test(sql)) {
      return this.state.migrationVersions.map((version) => ({ version })) as T[];
    }

    throw new Error(`Unsupported query: ${sql}`);
  }

  private cloneState(): MemoryDatabaseState {
    return {
      tables: new Set(this.state.tables),
      columns: new Map(
        [...this.state.columns].map(([table, columns]) => [
          table,
          new Set(columns),
        ]),
      ),
      migrationVersions: [...this.state.migrationVersions],
      pendingOperations: this.state.pendingOperations.map((operation) => ({
        ...operation,
      })),
    };
  }
}

test('rolls back all schema changes and preserves pending operations when v2 fails', async () => {
  const database = new MemoryMigrationDatabase();
  const initialPendingOperations = database.state.pendingOperations.map(
    (operation) => ({ ...operation }),
  );

  const migrations: SchemaMigration[] = [
    {
      version: 1,
      async up(db) {
        await db.runAsync(`
          CREATE TABLE IF NOT EXISTS incidents_pending (
            id INTEGER PRIMARY KEY NOT NULL
          )
        `);
      },
    },
    {
      version: 2,
      async up(db) {
        await db.runAsync(
          'ALTER TABLE incidents_pending ADD COLUMN migration_marker TEXT',
        );
        throw new Error('Forced failure in v2');
      },
    },
  ];

  const manager = new SchemaMigrationManager(database, migrations);

  await expect(manager.migrate()).rejects.toThrow('Forced failure in v2');

  expect(database.transactionCount).toBe(1);
  expect(database.rollbackCount).toBe(1);
  expect(database.state.tables.has('incidents_pending')).toBe(false);
  expect(database.state.migrationVersions).toEqual([]);
  expect(database.state.pendingOperations).toEqual(initialPendingOperations);
});

test('nominal: applies configured migrations and returns final schema version while preserving pending operations', async () => {
  const database = new MemoryMigrationDatabase();
  const initialPendingOperations = database.state.pendingOperations.map(
    (operation) => ({ ...operation }),
  );

  const migrations: SchemaMigration[] = [
    {
      version: 1,
      async up(db) {
        await db.runAsync(`
          CREATE TABLE IF NOT EXISTS incidents_pending (
            id INTEGER PRIMARY KEY NOT NULL
          )
        `);
      },
    },
    {
      version: 2,
      async up(db) {
        await db.runAsync(
          'ALTER TABLE incidents_pending ADD COLUMN migration_marker TEXT',
        );
      },
    },
  ];

  const manager = new SchemaMigrationManager(database, migrations);
  const finalVersion = await manager.migrate();

  expect(finalVersion).toBe(2);
  expect(database.transactionCount).toBe(1);
  expect(database.rollbackCount).toBe(0);
  expect(database.state.tables.has('incidents_pending')).toBe(true);
  expect(database.state.columns.get('incidents_pending')?.has('migration_marker')).toBe(true);
  expect(database.state.migrationVersions).toEqual([1, 2]);
  expect(database.state.pendingOperations).toEqual(initialPendingOperations);
});

test('boundary: preserves schema and pending operations with no changes when database is already up to date', async () => {
  const database = new MemoryMigrationDatabase();
  database.state.tables.add('incidents_pending');
  database.state.columns.set('incidents_pending', new Set(['migration_marker']));
  database.state.migrationVersions = [1, 2];

  const initialPendingOperations = database.state.pendingOperations.map(
    (operation) => ({ ...operation }),
  );

  let upCalled = false;
  const migrations: SchemaMigration[] = [
    {
      version: 1,
      async up() {
        upCalled = true;
      },
    },
    {
      version: 2,
      async up() {
        upCalled = true;
      },
    },
  ];

  const manager = new SchemaMigrationManager(database, migrations);
  const finalVersion = await manager.migrate();

  expect(finalVersion).toBe(2);
  expect(upCalled).toBe(false);
  expect(database.transactionCount).toBe(1);
  expect(database.rollbackCount).toBe(0);
  expect(database.state.tables.has('incidents_pending')).toBe(true);
  expect(database.state.migrationVersions).toEqual([1, 2]);
  expect(database.state.pendingOperations).toEqual(initialPendingOperations);
});

