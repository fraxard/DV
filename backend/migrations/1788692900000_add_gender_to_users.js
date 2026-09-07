exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    gender: {
      type: 'varchar(30)',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', ['gender']);
};
