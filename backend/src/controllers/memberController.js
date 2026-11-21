import * as memberService from '../services/memberService.js';

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateMemberPayload(body) {
  const memberCode = cleanString(body?.memberCode);
  const memberName = cleanString(body?.memberName);
  const email = cleanString(body?.email);

  if (!memberCode) return { error: 'memberCode จำเป็นต้องระบุ' };
  if (memberCode.length > 50) return { error: 'memberCode ต้องไม่เกิน 50 ตัวอักษร' };
  if (!memberName) return { error: 'memberName จำเป็นต้องระบุ' };
  if (memberName.length > 200) return { error: 'memberName ต้องไม่เกิน 200 ตัวอักษร' };
  if (email && (!email.includes('@') || email.length > 200)) return { error: 'email ไม่ถูกต้อง' };

  return {
    memberCode,
    memberName,
    email: email || null,
    isActive: body?.isActive === undefined ? true : Boolean(body.isActive),
  };
}

export async function list(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const requestedSize = Number.parseInt(req.query.pageSize, 10) || 20;
    const pageSize = Math.min(100, Math.max(1, requestedSize));
    const search = cleanString(req.query.search).slice(0, 200);

    const data = await memberService.list({ page, pageSize, search });
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

    const data = await memberService.getById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function create(req, res, next) {
  try {
    const payload = validateMemberPayload(req.body);
    if (payload.error) {
      return res.status(400).json({ success: false, message: payload.error });
    }

    const data = await memberService.create(payload);
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

    if (req.body?.memberCode !== undefined) {
      const memberCode = cleanString(req.body.memberCode);
      if (!memberCode || memberCode.length > 50) {
        return res.status(400).json({ success: false, message: 'memberCode ไม่ถูกต้อง' });
      }
      patch.memberCode = memberCode;
    }

    if (req.body?.memberName !== undefined) {
      const memberName = cleanString(req.body.memberName);
      if (!memberName || memberName.length > 200) {
        return res.status(400).json({ success: false, message: 'memberName ไม่ถูกต้อง' });
      }
      patch.memberName = memberName;
    }

    if (req.body?.email !== undefined) {
      const email = cleanString(req.body.email);
      if (email && (!email.includes('@') || email.length > 200)) {
        return res.status(400).json({ success: false, message: 'email ไม่ถูกต้อง' });
      }
      patch.email = email || null;
    }

    if (req.body?.isActive !== undefined) {
      patch.isActive = Boolean(req.body.isActive);
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่ต้องการแก้ไข' });
    }

    const data = await memberService.update(id, patch);
    if (!data) {
      return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    }

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
    }

    const deleted = await memberService.remove(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'ไม่พบสมาชิก' });
    }

    return res.json({ success: true, data: null });
  } catch (error) {
    return next(error);
  }
}
