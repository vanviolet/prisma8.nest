#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3a0a23daeb3210f62332cca0ff6f131e79db2f735472dee823066c0bfc41c502/contract';
import endContract from '../../snapshots/3a0a23daeb3210f62332cca0ff6f131e79db2f735472dee823066c0bfc41c502/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract';
import startContract from '../../snapshots/91e7f9f035806fa2789a4d726ef7724cad434fd6b00014d47ebf12d6e6bb784e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('passwordHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('role', 'text', {
          notNull: true,
          default: lit('USER'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'User',
        constraint: 'User_role_check_1954e8c0',
        expression: "\"role\" IN ('USER', 'ADMIN')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
