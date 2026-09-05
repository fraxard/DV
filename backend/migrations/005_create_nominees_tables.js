exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create nominees table
  pgm.createTable('nominees', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    full_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
    },
    phone: {
      type: 'varchar(50)',
    },
    relationship: {
      type: 'varchar(50)',
      notNull: true,
    },
    notes: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('nominees', 'user_id');

  // Enforce case-insensitive email uniqueness per owner using raw SQL index
  pgm.sql(`
    CREATE UNIQUE INDEX uq_nominees_user_lower_email
    ON nominees (user_id, LOWER(email));
  `);

  // 2. Create normalized asset_nominees junction table
  pgm.createTable('asset_nominees', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    asset_id: {
      type: 'uuid',
      notNull: true,
      references: 'assets(id)',
      onDelete: 'CASCADE',
    },
    nominee_id: {
      type: 'uuid',
      notNull: true,
      references: 'nominees(id)',
      onDelete: 'CASCADE',
    },
    allocation_percentage: {
      type: 'numeric(5, 2)',
      notNull: true,
      check: 'allocation_percentage >= 0 AND allocation_percentage <= 100',
    },
    can_view: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    can_download_docs: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('asset_nominees', 'uq_asset_nominees_asset_nominee', {
    unique: ['asset_id', 'nominee_id'],
  });

  pgm.createIndex('asset_nominees', 'asset_id');
  pgm.createIndex('asset_nominees', 'nominee_id');
};

exports.down = (pgm) => {
  pgm.dropTable('asset_nominees');
  pgm.dropTable('nominees');
};
