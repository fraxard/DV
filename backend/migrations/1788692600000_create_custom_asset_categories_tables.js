exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Custom Asset Categories Table
  pgm.createTable('custom_asset_categories', {
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
      type: 'varchar(100)',
      notNull: true,
    },
    key: {
      type: 'varchar(100)',
      notNull: true,
    },
    description: {
      type: 'text',
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

  pgm.addConstraint('custom_asset_categories', 'uq_custom_asset_categories_user_key', {
    unique: ['user_id', 'key'],
  });

  pgm.createIndex('custom_asset_categories', ['user_id'], {
    name: 'idx_custom_asset_categories_user_id',
  });

  // 2. Custom Asset Fields Table
  pgm.createTable('custom_asset_fields', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    category_id: {
      type: 'uuid',
      notNull: true,
      references: 'custom_asset_categories(id)',
      onDelete: 'CASCADE',
    },
    key: {
      type: 'varchar(100)',
      notNull: true,
    },
    label: {
      type: 'varchar(150)',
      notNull: true,
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    is_required: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    order_index: {
      type: 'integer',
      notNull: true,
      default: 0,
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

  pgm.addConstraint('custom_asset_fields', 'uq_custom_asset_fields_cat_key', {
    unique: ['category_id', 'key'],
  });

  pgm.createIndex('custom_asset_fields', ['category_id'], {
    name: 'idx_custom_asset_fields_category_id',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('custom_asset_fields');
  pgm.dropTable('custom_asset_categories');
};
