exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('assets', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    category: {
      type: 'varchar(50)',
      notNull: true,
    },
    subcategory: {
      type: 'varchar(50)',
    },
    description: {
      type: 'text',
    },
    estimated_value: {
      type: 'numeric(15, 2)',
      check: 'estimated_value >= 0',
    },
    currency: {
      type: 'varchar(10)',
      notNull: true,
      default: 'INR',
    },
    valuation_date: {
      type: 'date',
    },
    metadata: {
      type: 'jsonb',
      notNull: true,
      default: '{}',
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

  pgm.createIndex('assets', 'user_id');
  pgm.createIndex('assets', ['user_id', 'category']);
};

exports.down = (pgm) => {
  pgm.dropTable('assets');
};
