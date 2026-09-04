exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    onboarding_completed: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    date_of_birth: {
      type: 'date',
    },
    phone: {
      type: 'varchar(30)',
    },
    country: {
      type: 'varchar(100)',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', [
    'onboarding_completed',
    'date_of_birth',
    'phone',
    'country',
  ]);
};