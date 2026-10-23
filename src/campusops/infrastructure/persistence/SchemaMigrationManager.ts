export interface MigrationDatabase {
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  runAsync(sql: string): Promise<unknown>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

export interface SchemaMigration {
  version: number;
  up(database: MigrationDatabase): Promise<void>;
}

interface MigrationVersionRow {
  version: number;
}

export class SchemaMigrationManager {
  private readonly migrations: readonly SchemaMigration[];

  constructor(
    private readonly database: MigrationDatabase,
    migrations: readonly SchemaMigration[],
  ) {
    this.migrations = [...migrations];
    this.validateMigrationSequence();
  }

  async migrate(): Promise<number> {
    let finalVersion = 0;

    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY NOT NULL,
          applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const appliedRows = await this.database.getAllAsync<MigrationVersionRow>(`
        SELECT version
        FROM schema_migrations
        ORDER BY version ASC
      `);

      this.validateAppliedVersions(appliedRows);

      let currentVersion = appliedRows.length;

      if (currentVersion > this.migrations.length) {
        throw new Error(
          `Database schema version ${currentVersion} is newer than the configured migrations.`,
        );
      }

      for (const migration of this.migrations) {
        if (migration.version <= currentVersion) {
          continue;
        }

        await migration.up(this.database);
        await this.database.runAsync(
          `INSERT INTO schema_migrations (version) VALUES (${migration.version})`,
        );

        currentVersion = migration.version;
      }

      finalVersion = currentVersion;
    });

    return finalVersion;
  }

  private validateMigrationSequence(): void {
    for (let index = 0; index < this.migrations.length; index += 1) {
      const migration = this.migrations[index];

      if (!migration || migration.version !== index + 1) {
        throw new Error(
          `Migrations must be ordered and consecutive starting at version 1; expected version ${index + 1}.`,
        );
      }
    }
  }

  private validateAppliedVersions(rows: readonly MigrationVersionRow[]): void {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      if (!row || row.version !== index + 1) {
        throw new Error('Applied migration versions are missing or out of sequence.');
      }
    }
  }
}
