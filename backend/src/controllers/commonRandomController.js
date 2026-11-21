import * as commonRandomService from '../services/commonRandomService.js';

function parseNumbers(value) {
  if (!Array.isArray(value)) return null;

  const numbers = value.map((item) => String(item).trim()).filter(Boolean);
  if (numbers.length === 0) return null;
  if (numbers.some((item) => !/^\d{1,12}$/.test(item))) return null;

  return numbers;
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function list(req, res, next) {
  try {
    const page = Math.max(1, toInt(req.query.page, 1));
    const pageSize = Math.min(100, Math.max(1, toInt(req.query.pageSize, 10)));

    const data = await commonRandomService.list({ page, pageSize });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
    }

    const data = await commonRandomService.getById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการหมุน' });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const numbers = parseNumbers(req.body?.numbers);
    if (!numbers) {
      return res.status(400).json({
        success: false,
        message: 'numbers ต้องเป็น array ของตัวเลขอย่างน้อย 1 รายการ',
      });
    }

    const resultNumber =
      req.body?.resultNumber === undefined || req.body?.resultNumber === null
        ? null
        : String(req.body.resultNumber).trim() || null;

    const data = await commonRandomService.create({
      numbers,
      resultNumber,
      totalBalls: toInt(req.body?.totalBalls, numbers.length),
      spinSeconds: Math.min(600, toInt(req.body?.spinSeconds, 5)),
    });

    return res.status(201).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
    }

    const patch = {};

    if (req.body?.numbers !== undefined) {
      const numbers = parseNumbers(req.body.numbers);
      if (!numbers) {
        return res.status(400).json({ success: false, message: 'numbers ไม่ถูกต้อง' });
      }
      patch.numbers = numbers;
    }

    if (req.body?.resultNumber !== undefined) {
      patch.resultNumber = req.body.resultNumber === null ? null : String(req.body.resultNumber).trim() || null;
    }

    if (req.body?.totalBalls !== undefined) {
      patch.totalBalls = toInt(req.body.totalBalls, 0);
    }

    if (req.body?.spinSeconds !== undefined) {
      patch.spinSeconds = Math.min(600, toInt(req.body.spinSeconds, 5));
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
    }

    const data = await commonRandomService.update(id, patch);
    if (!data) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการหมุน' });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function removeAll(req, res, next) {
  try {
    const deleted = await commonRandomService.removeAll();
    res.json({ success: true, data: { deleted } });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
    }

    const deleted = await commonRandomService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลการหมุน' });
    }

    return res.json({ success: true, data: null });
  } catch (error) {
    return next(error);
  }
}
