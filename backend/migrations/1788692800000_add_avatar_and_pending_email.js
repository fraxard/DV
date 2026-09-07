exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    avatar_url: {
      type: 'varchar(500)',
      notNull: false,
    },
  });

  pgm.addColumn('email_verification_tokens', {
    pending_email: {
      type: 'varchar(255)',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('email_verification_tokens', ['pending_email']);
  pgm.dropColumn('users', ['avatar_url']);
};
