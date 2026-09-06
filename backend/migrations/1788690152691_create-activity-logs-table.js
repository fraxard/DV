exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('activity_logs', {
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
    action: {
      type: 'varchar(50)',
      notNull: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    category: {
      type: 'varchar(50)',
      notNull: true,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('activity_logs', ['user_id', { name: 'created_at', sort: 'DESC' }]);
};

exports.down = (pgm) => {
  pgm.dropTable('activity_logs');
};

