#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3a0a23daeb3210f62332cca0ff6f131e79db2f735472dee823066c0bfc41c502/contract';
import startContract from '../../snapshots/3a0a23daeb3210f62332cca0ff6f131e79db2f735472dee823066c0bfc41c502/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5ddd441747ecc6edca8e2bc2e0f79bc33ef5d8ff1acd2e777a35540947481de2/contract';
import endContract from '../../snapshots/5ddd441747ecc6edca8e2bc2e0f79bc33ef5d8ff1acd2e777a35540947481de2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'UploadedFile',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('mimeType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('originalName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('size', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('storageName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('uploadedById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UploadedFile',
        constraint: 'UploadedFile_storageName_key',
        columns: ['storageName'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UploadedFile',
        index: 'UploadedFile_uploadedById_createdAt_idx_7e8cc7c7',
        columns: ['uploadedById', 'createdAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
