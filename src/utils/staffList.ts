import { FloorStaff } from '../types';

// Reads rows copied from Excel / Google Sheets (tab separated) or typed as "Name, Role, Phone".
// Role words are matched loosely; a blank role means operator, an unknown word means "other".
// A header row is skipped.
export const parseStaffList = (text: string): Array<Pick<FloorStaff, 'name' | 'role' | 'phone'>> => {
  const roleOf = (raw: string): FloorStaff['role'] => {
    const r = raw.toLowerCase();
    if (r.includes('help')) return 'helper';
    if (r.includes('super') || r.includes('incharge') || r.includes('in-charge') || r.includes('manager')) return 'supervisor';
    if (r.includes('oper')) return 'operator';
    return r.trim() ? 'other' : 'operator';
  };

  return text
    .split(/\r?\n/)
    .map((line) => line.split(line.includes('\t') ? '\t' : ',').map((c) => c.trim()))
    .filter((cells) => cells[0] && !/^(name|employee|staff)/i.test(cells[0]))
    .map(([name, role = '', phone = '']) => {
      // Accept "Name, Phone" too: a number in the role column is the phone.
      const roleLooksLikePhone = /^[+\d][\d\s-]{6,}$/.test(role);
      return {
        name,
        role: roleLooksLikePhone ? 'operator' : roleOf(role),
        phone: roleLooksLikePhone ? role : phone,
      };
    });
};
