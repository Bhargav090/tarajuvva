const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { all, run, get } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { generateSlotsPreview, normalizeSlotRow, toISODateString } = require('../utils/consultationSlots');

const adminRouter = express.Router();
const publicRouter = express.Router();

adminRouter.use(authenticateAdmin);

/** Preview slots without saving. */
adminRouter.post('/preview', (req, res) => {
  try {
    const slots = generateSlotsPreview(req.body);
    res.json({ success: true, slots });
  } catch (err) {
    res.status(err.status || 400).json({ success: false, message: err.message });
  }
});

/** List all slots (newest dates first). */
adminRouter.get('/', async (req, res) => {
  const rows = await all(
    `SELECT id, slot_date, slot_time, is_booked, booked_request_id, created_at
     FROM consultation_slots
     ORDER BY slot_date ASC, slot_time ASC`
  );
  res.json({
    success: true,
    slots: rows.map((r) => ({
      ...normalizeSlotRow(r),
      is_booked: Boolean(r.is_booked),
    })),
  });
});

/** Bulk-create slots from preview. Skips duplicates. */
adminRouter.post('/', async (req, res) => {
  const slots = req.body.slots;
  if (!Array.isArray(slots) || !slots.length) {
    return res.status(400).json({ success: false, message: 'No slots to create.' });
  }

  let created = 0;
  let skipped = 0;

  for (const slot of slots) {
    const { slot_date, slot_time } = slot;
    if (!slot_date || !slot_time) continue;

    const existing = await get(
      'SELECT id FROM consultation_slots WHERE slot_date = ? AND slot_time = ?',
      [slot_date, slot_time]
    );
    if (existing) {
      skipped += 1;
      continue;
    }

    await run(
      'INSERT INTO consultation_slots (id, slot_date, slot_time) VALUES (?, ?, ?)',
      [uuidv4(), slot_date, slot_time]
    );
    created += 1;
  }

  const allSlots = await all(
    `SELECT id, slot_date, slot_time, is_booked, booked_request_id, created_at
     FROM consultation_slots ORDER BY slot_date ASC, slot_time ASC`
  );

  res.status(201).json({
    success: true,
    created,
    skipped,
    slots: allSlots.map((r) => ({
      ...normalizeSlotRow(r),
      is_booked: Boolean(r.is_booked),
    })),
  });
});

/** Delete unbooked slots in bulk by id list or date range. */
adminRouter.post('/bulk-delete', async (req, res) => {
  const { slot_ids: slotIds, from_date: fromDate, to_date: toDate } = req.body || {};

  if (Array.isArray(slotIds) && slotIds.length) {
    let deleted = 0;
    let skipped = 0;
    for (const id of slotIds) {
      const row = await get('SELECT * FROM consultation_slots WHERE id = ?', [id]);
      if (!row) continue;
      if (row.is_booked) {
        skipped += 1;
        continue;
      }
      await run('DELETE FROM consultation_slots WHERE id = ?', [id]);
      deleted += 1;
    }
    return res.json({ success: true, deleted, skipped });
  }

  if (fromDate && toDate) {
    const result = await run(
      `DELETE FROM consultation_slots
       WHERE is_booked = 0 AND slot_date >= ? AND slot_date <= ?`,
      [toISODateString(fromDate), toISODateString(toDate)]
    );
    return res.json({ success: true, deleted: result.affectedRows || 0 });
  }

  return res.status(400).json({
    success: false,
    message: 'Provide slot_ids array or from_date and to_date.',
  });
});

/** Delete an unbooked slot. */
adminRouter.delete('/:id', async (req, res) => {
  const row = await get('SELECT * FROM consultation_slots WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Slot not found.' });
  if (row.is_booked) {
    return res.status(400).json({ success: false, message: 'Cannot delete a booked slot.' });
  }
  await run('DELETE FROM consultation_slots WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

/** Dates that have at least one available slot (today onwards). */
publicRouter.get('/dates', async (req, res) => {
  const rows = await all(
    `SELECT DATE_FORMAT(slot_date, '%Y-%m-%d') AS slot_date, COUNT(*) AS open_count
     FROM consultation_slots
     WHERE is_booked = 0 AND slot_date >= CURDATE()
     GROUP BY slot_date
     HAVING open_count > 0
     ORDER BY slot_date ASC`
  );
  res.json({
    success: true,
    dates: rows.map((r) => r.slot_date).filter(Boolean),
  });
});

/** Available slots for a given date. */
publicRouter.get('/', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD).' });
  }

  const rows = await all(
    `SELECT id, slot_date, slot_time
     FROM consultation_slots
     WHERE slot_date = ? AND is_booked = 0
     ORDER BY slot_time ASC`,
    [date]
  );

  res.json({
    success: true,
    slots: rows.map((r) => {
      const normalized = normalizeSlotRow(r);
      return {
        id: normalized.id,
        slot_date: normalized.slot_date,
        slot_time: normalized.slot_time,
        label: normalized.label,
      };
    }),
  });
});

module.exports = { adminRouter, publicRouter };
