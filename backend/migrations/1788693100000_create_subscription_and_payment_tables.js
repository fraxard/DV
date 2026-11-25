exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. subscriptions table
  pgm.createTable('subscriptions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'TRIAL_ACTIVE',
    },
    trial_starts_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    trial_ends_at: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    current_period_starts_at: {
      type: 'timestamp with time zone',
      null: true,
    },
    current_period_ends_at: {
      type: 'timestamp with time zone',
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

  pgm.createIndex('subscriptions', ['user_id'], { name: 'idx_subscriptions_user_id' });
  pgm.createIndex('subscriptions', ['status'], { name: 'idx_subscriptions_status' });

  // 2. payment_orders table
  pgm.createTable('payment_orders', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)',
      onDelete: 'RESTRICT', // preserve financial audit history
    },
    razorpay_order_id: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    amount: {
      type: 'integer',
      notNull: true,
      default: 99900, // 999 INR in paise
    },
    currency: {
      type: 'varchar(10)',
      notNull: true,
      default: 'INR',
    },
    status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'CREATED',
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

  pgm.createIndex('payment_orders', ['user_id'], { name: 'idx_payment_orders_user_id' });
  pgm.createIndex('payment_orders', ['razorpay_order_id'], { name: 'idx_payment_orders_razorpay_order_id' });
  pgm.createIndex('payment_orders', ['status'], { name: 'idx_payment_orders_status' });

  // 3. payment_transactions table
  pgm.createTable('payment_transactions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    payment_order_id: {
      type: 'uuid',
      notNull: true,
      references: 'payment_orders(id)',
      onDelete: 'RESTRICT',
    },
    razorpay_payment_id: {
      type: 'varchar(100)',
      unique: true,
      null: true,
    },
    transaction_status: {
      type: 'varchar(30)',
      notNull: true,
    },
    captured_amount: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    currency: {
      type: 'varchar(10)',
      notNull: true,
      default: 'INR',
    },
    signature: {
      type: 'varchar(255)',
      null: true,
    },
    signature_verified: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    failure_reason: {
      type: 'text',
      null: true,
    },
    subscription_period_applied_at: {
      type: 'timestamp with time zone',
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

  pgm.createIndex('payment_transactions', ['payment_order_id'], { name: 'idx_payment_transactions_order_id' });
  pgm.createIndex('payment_transactions', ['razorpay_payment_id'], { name: 'idx_payment_transactions_razorpay_payment_id' });
  pgm.createIndex('payment_transactions', ['subscription_period_applied_at'], { name: 'idx_payment_transactions_period_applied' });

  // 4. webhook_events table
  pgm.createTable('webhook_events', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    event_id: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    event_type: {
      type: 'varchar(100)',
      notNull: true,
    },
    processing_status: {
      type: 'varchar(30)',
      notNull: true,
      default: 'RECEIVED',
    },
    razorpay_order_id: {
      type: 'varchar(100)',
      null: true,
    },
    razorpay_payment_id: {
      type: 'varchar(100)',
      null: true,
    },
    payload: {
      type: 'jsonb',
      notNull: true,
    },
    error_details: {
      type: 'text',
      null: true,
    },
    received_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    processed_at: {
      type: 'timestamp with time zone',
      null: true,
    },
  });

  pgm.createIndex('webhook_events', ['event_id'], { name: 'idx_webhook_events_event_id' });
  pgm.createIndex('webhook_events', ['event_type'], { name: 'idx_webhook_events_event_type' });
  pgm.createIndex('webhook_events', ['processing_status'], { name: 'idx_webhook_events_processing_status' });

  // Backfill existing accounts based on their actual created_at
  // This guarantees existing accounts do not receive an unexpected new trial
  pgm.sql(`
    INSERT INTO subscriptions (user_id, status, trial_starts_at, trial_ends_at, created_at, updated_at)
    SELECT
      id,
      CASE
        WHEN created_at + INTERVAL '3 months' > CURRENT_TIMESTAMP THEN 'TRIAL_ACTIVE'
        ELSE 'TRIAL_EXPIRED'
      END AS status,
      created_at AS trial_starts_at,
      created_at + INTERVAL '3 months' AS trial_ends_at,
      created_at,
      CURRENT_TIMESTAMP
    FROM users
    ON CONFLICT (user_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('webhook_events');
  pgm.dropTable('payment_transactions');
  pgm.dropTable('payment_orders');
  pgm.dropTable('subscriptions');
};
