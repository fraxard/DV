exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('support_submissions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
      null: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
    },
    subject: {
      type: 'varchar(255)',
      notNull: true,
    },
    message: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'open',
    },
    email_delivery_status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
    },
    error_message: {
      type: 'text',
      null: true,
    },
    ip_address: {
      type: 'varchar(100)',
      null: true,
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
  });

  pgm.addConstraint('support_submissions', 'support_submissions_delivery_status_check', {
    check: "email_delivery_status IN ('pending', 'sent', 'failed')",
  });

  pgm.addConstraint('support_submissions', 'support_submissions_status_check', {
    check: "status IN ('open', 'in_progress', 'resolved', 'closed')",
  });

  pgm.createIndex('support_submissions', ['created_at'], {
    name: 'idx_support_submissions_created_at',
  });

  pgm.createIndex('support_submissions', ['email'], {
    name: 'idx_support_submissions_email',
  });

  pgm.createIndex('support_submissions', ['email_delivery_status'], {
    name: 'idx_support_submissions_delivery_status',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('support_submissions');
};
