exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('tasks', {
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
      null: true,
      references: 'assets(id)',
      onDelete: 'SET NULL',
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
      null: true,
    },
    due_date: {
      type: 'date',
      notNull: true,
    },
    due_time: {
      type: 'time',
      null: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'scheduled',
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    completed_at: {
      type: 'timestamp with time zone',
      null: true,
    },
  });

  pgm.addConstraint('tasks', 'tasks_status_check', {
    check: "status IN ('scheduled', 'completed', 'missed')",
  });

  pgm.createIndex('tasks', ['user_id', 'due_date'], {
    name: 'idx_tasks_user_due_date',
  });

  pgm.createIndex('tasks', ['user_id', 'status'], {
    name: 'idx_tasks_user_status',
  });

  pgm.createIndex('tasks', ['asset_id'], {
    name: 'idx_tasks_asset_id',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('tasks');
};
