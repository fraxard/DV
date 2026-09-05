const pool = require('../db');
const { Errors } = require('../utils/errors');

const normalizePhone = (phone) => {
  if (phone === undefined || phone === null) return null;
  const str = String(phone).trim();
  if (!str) return null;
  const cleaned = str.replace(/\s+/g, '');
  return cleaned === '' ? null : cleaned;
};

const validateNomineeData = ({ fullName, email, relationship, phone, notes }) => {
  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    throw Errors.badRequest('Nominee full name is required.');
  }
  if (fullName.trim().length > 255) {
    throw Errors.badRequest('Full name cannot exceed 255 characters.');
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw Errors.badRequest('Nominee email is required.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw Errors.badRequest('Invalid nominee email address.');
  }
  if (email.trim().length > 255) {
    throw Errors.badRequest('Email cannot exceed 255 characters.');
  }

  if (!relationship || typeof relationship !== 'string' || !relationship.trim()) {
    throw Errors.badRequest('Relationship is required.');
  }
  if (relationship.trim().length > 50) {
    throw Errors.badRequest('Relationship cannot exceed 50 characters.');
  }

  if (phone !== undefined && phone !== null && phone !== '') {
    if (typeof phone !== 'string' || phone.trim().length > 50) {
      throw Errors.badRequest('Phone number cannot exceed 50 characters.');
    }
  }

  if (notes !== undefined && notes !== null && notes !== '') {
    if (typeof notes !== 'string' || notes.trim().length > 2000) {
      throw Errors.badRequest('Notes cannot exceed 2000 characters.');
    }
  }
};

const getNomineeStats = async (userId) => {
  const totalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM nominees WHERE user_id = $1`,
    [userId]
  );
  const totalNominees = totalRes.rows[0].total;

  const assignedRes = await pool.query(
    `
      SELECT COUNT(DISTINCT an.nominee_id)::int AS assigned
      FROM asset_nominees an
      JOIN nominees n ON n.id = an.nominee_id
      WHERE n.user_id = $1
    `,
    [userId]
  );
  const assignedCount = assignedRes.rows[0].assigned;
  const unassignedCount = Math.max(0, totalNominees - assignedCount);

  return {
    total_nominees: totalNominees,
    assigned_to_assets: assignedCount,
    unassigned: unassignedCount,
  };
};

const getNomineeDashboardSummary = async (userId) => {
  // 1. Total assets in vault for this user (denominator)
  const assetCountRes = await pool.query(
    `SELECT COUNT(*)::int AS total_assets FROM assets WHERE user_id = $1`,
    [userId]
  );
  const totalAssets = assetCountRes.rows[0].total_assets;

  // 2. All nominees owned by user
  const nomineesRes = await pool.query(
    `
      SELECT
        n.id,
        n.user_id,
        n.full_name,
        n.email,
        n.phone,
        n.relationship,
        n.notes,
        n.created_at,
        n.updated_at,
        COUNT(DISTINCT an.asset_id)::int AS assigned_assets_count
      FROM nominees n
      LEFT JOIN asset_nominees an ON an.nominee_id = n.id
      WHERE n.user_id = $1
      GROUP BY n.id
      ORDER BY n.created_at ASC
    `,
    [userId]
  );
  const nominees = nomineesRes.rows;

  if (nominees.length === 0) {
    return {
      total_nominees: 0,
      total_assets: totalAssets,
      nominees: [],
    };
  }

  if (totalAssets === 0) {
    return {
      total_nominees: nominees.length,
      total_assets: 0,
      nominees: nominees.map((n) => ({
        ...n,
        raw_average_share: 0,
        overall_share: 0,
      })),
    };
  }

  // 3. Allocations per nominee
  const allocRes = await pool.query(
    `
      SELECT
        an.nominee_id,
        COALESCE(SUM(an.allocation_percentage), 0)::float AS total_allocation_sum
      FROM asset_nominees an
      JOIN assets a ON a.id = an.asset_id
      WHERE a.user_id = $1
      GROUP BY an.nominee_id
    `,
    [userId]
  );

  const allocMap = new Map();
  allocRes.rows.forEach((r) => {
    allocMap.set(r.nominee_id, r.total_allocation_sum);
  });

  // Calculate raw average share for each nominee: sum(P) / totalAssets
  let totalRawAverage = 0;
  const rawAverages = nominees.map((n) => {
    const sumP = allocMap.get(n.id) || 0;
    const rawAvg = sumP / totalAssets;
    totalRawAverage += rawAvg;
    return {
      ...n,
      sum_allocation: sumP,
      raw_average: rawAvg,
    };
  });

  let mappedNominees;
  if (totalRawAverage === 0) {
    mappedNominees = rawAverages.map((n) => ({
      ...n,
      raw_average_share: 0,
      overall_share: 0,
    }));
  } else {
    // If allocations exist, normalize across all nominees so sum equals 100%
    // In standard cases where assets are 100% allocated, totalRawAverage is already 100
    mappedNominees = rawAverages.map((n) => {
      const normalized = (n.raw_average / totalRawAverage) * 100;
      const rounded = Math.round(normalized * 100) / 100;
      return {
        ...n,
        raw_average_share: Math.round(n.raw_average * 100) / 100,
        overall_share: rounded,
      };
    });
  }

  return {
    total_nominees: nominees.length,
    total_assets: totalAssets,
    nominees: mappedNominees,
  };
};

const listNominees = async (userId) => {
  // Use dashboard summary calculation to provide consistent normalized/average shares
  const summary = await getNomineeDashboardSummary(userId);
  return summary.nominees;
};

const getNominee = async (userId, nomineeId) => {
  const nomineeRes = await pool.query(
    `
      SELECT
        id,
        user_id,
        full_name,
        email,
        phone,
        relationship,
        notes,
        created_at,
        updated_at
      FROM nominees
      WHERE id = $1 AND user_id = $2
    `,
    [nomineeId, userId]
  );

  if (nomineeRes.rows.length === 0) {
    throw Errors.notFound('Nominee not found.');
  }

  const nominee = nomineeRes.rows[0];

  // Fetch assigned assets for this nominee
  const assetsRes = await pool.query(
    `
      SELECT
        an.id AS assignment_id,
        an.asset_id,
        a.name AS asset_name,
        a.category AS asset_category,
        an.allocation_percentage::float AS allocation_percentage,
        an.can_view,
        an.can_download_docs,
        an.created_at AS assigned_at
      FROM asset_nominees an
      JOIN assets a ON a.id = an.asset_id
      WHERE an.nominee_id = $1
      ORDER BY an.created_at ASC
    `,
    [nomineeId]
  );

  nominee.assigned_assets = assetsRes.rows;
  return nominee;
};

const createNominee = async (userId, data) => {
  const {
    fullName,
    full_name,
    email,
    phone,
    relationship,
    notes,
  } = data;

  const resolvedName = fullName !== undefined ? fullName : full_name;
  validateNomineeData({
    fullName: resolvedName,
    email,
    relationship,
    phone,
    notes,
  });

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  if (normalizedPhone) {
    const existingPhone = await pool.query(
      `SELECT id FROM nominees WHERE user_id = $1 AND phone = $2`,
      [userId, normalizedPhone]
    );
    if (existingPhone.rows.length > 0) {
      throw Errors.badRequest('A nominee with this phone number already exists.');
    }
  }

  try {
    const result = await pool.query(
      `
        INSERT INTO nominees (
          user_id,
          full_name,
          email,
          phone,
          relationship,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          id,
          user_id,
          full_name,
          email,
          phone,
          relationship,
          notes,
          created_at,
          updated_at
      `,
      [
        userId,
        resolvedName.trim(),
        normalizedEmail,
        normalizedPhone,
        relationship.trim(),
        notes ? notes.trim() : null,
      ]
    );

    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'uq_nominees_user_phone') {
        throw Errors.badRequest('A nominee with this phone number already exists.');
      }
      if (err.constraint === 'uq_nominees_user_lower_email') {
        throw Errors.badRequest('A nominee with this email already exists.');
      }
      throw Errors.badRequest('A nominee with these details already exists.');
    }
    throw err;
  }
};

const updateNominee = async (userId, nomineeId, data) => {
  const existing = await getNominee(userId, nomineeId);

  const {
    fullName,
    full_name,
    email,
    phone,
    relationship,
    notes,
  } = data;

  const resolvedName = fullName !== undefined ? fullName : (full_name !== undefined ? full_name : existing.full_name);
  const resolvedEmail = email !== undefined ? email : existing.email;
  const resolvedRel = relationship !== undefined ? relationship : existing.relationship;
  const resolvedPhone = phone !== undefined ? phone : existing.phone;
  const resolvedNotes = notes !== undefined ? notes : existing.notes;

  validateNomineeData({
    fullName: resolvedName,
    email: resolvedEmail,
    relationship: resolvedRel,
    phone: resolvedPhone,
    notes: resolvedNotes,
  });

  const normalizedEmail = resolvedEmail.trim().toLowerCase();
  const normalizedPhone = normalizePhone(resolvedPhone);

  if (normalizedPhone) {
    const existingPhone = await pool.query(
      `SELECT id FROM nominees WHERE user_id = $1 AND phone = $2 AND id != $3`,
      [userId, normalizedPhone, nomineeId]
    );
    if (existingPhone.rows.length > 0) {
      throw Errors.badRequest('A nominee with this phone number already exists.');
    }
  }

  try {
    const result = await pool.query(
      `
        UPDATE nominees
        SET
          full_name = $1,
          email = $2,
          phone = $3,
          relationship = $4,
          notes = $5,
          updated_at = current_timestamp
        WHERE id = $6 AND user_id = $7
        RETURNING
          id,
          user_id,
          full_name,
          email,
          phone,
          relationship,
          notes,
          created_at,
          updated_at
      `,
      [
        resolvedName.trim(),
        normalizedEmail,
        normalizedPhone,
        resolvedRel.trim(),
        resolvedNotes ? resolvedNotes.trim() : null,
        nomineeId,
        userId,
      ]
    );

    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      if (err.constraint === 'uq_nominees_user_phone') {
        throw Errors.badRequest('A nominee with this phone number already exists.');
      }
      if (err.constraint === 'uq_nominees_user_lower_email') {
        throw Errors.badRequest('A nominee with this email already exists.');
      }
      throw Errors.badRequest('A nominee with these details already exists.');
    }
    throw err;
  }
};

const deleteNominee = async (userId, nomineeId) => {
  const result = await pool.query(
    `
      DELETE FROM nominees
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `,
    [nomineeId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Nominee not found.');
  }

  return { id: result.rows[0].id };
};

module.exports = {
  listNominees,
  getNominee,
  createNominee,
  updateNominee,
  deleteNominee,
  getNomineeStats,
  getNomineeDashboardSummary,
  normalizePhone,
};
