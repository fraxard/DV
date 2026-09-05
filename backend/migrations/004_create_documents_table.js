exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('documents', {
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
    asset_id: {
      type: 'uuid',
      references: 'assets(id)',
      onDelete: 'SET NULL',
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    mime_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    file_size: {
      type: 'bigint',
      notNull: true,
      check: 'file_size > 0',
    },
    storage_key: {
      type: 'varchar(500)',
      notNull: true,
      unique: true,
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

  pgm.createIndex('documents', 'user_id');
  pgm.createIndex('documents', ['user_id', 'asset_id']);
  pgm.createIndex('documents', 'storage_key');
};

exports.down = (pgm) => {
  pgm.dropTable('documents');
};
