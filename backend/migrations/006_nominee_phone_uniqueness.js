exports.shorthands = undefined;

exports.up = async (pgm) => {
  // 1. Safety check: detect existing duplicate phone numbers per user
  const duplicates = await pgm.db.select(`
    SELECT user_id, phone, COUNT(*) AS count
    FROM nominees
    WHERE phone IS NOT NULL AND TRIM(phone) != ''
    GROUP BY user_id, phone
    HAVING COUNT(*) > 1
  `);

  if (duplicates.length > 0) {
    const report = duplicates
      .map((d) => `User ${d.user_id}: phone '${d.phone}' shared by ${d.count} nominees`)
      .join('; ');
    throw new Error(
      `MIGRATION ABORTED: Duplicate phone numbers detected in nominees table. ` +
      `Unique constraint cannot be applied without resolving duplicates. Details: ${report}`
    );
  }

  // 2. Create partial unique index on (user_id, phone) where phone is populated
  pgm.sql(`
    CREATE UNIQUE INDEX uq_nominees_user_phone
    ON nominees (user_id, phone)
    WHERE phone IS NOT NULL AND phone != '';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS uq_nominees_user_phone;`);
};
