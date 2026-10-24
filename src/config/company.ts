// Progressive Enterprises' own details, printed on challans, PDFs, emails and the footer.
// Edit this one file to change them everywhere. Leave a value as '' to hide it.
export const COMPANY = {
  name: 'PROGRESSIVE ENTERPRISES',
  tagline: 'Precision Slitting Works',
  address: 'Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302',
  gstin: '', // TODO: real GSTIN (the old value 27AAACP1234F1Z8 was a placeholder)
  phone: '', // TODO: real phone number (the old value +91 98200 45678 was a placeholder)
  email: 'progressive.ent8@gmail.com',
  jurisdiction: 'Bhiwandi / Thane',
};

// "GSTIN: … | Tel: … | Email: …" with empty parts left out.
export const companyContactLine = () =>
  [
    COMPANY.gstin && `GSTIN: ${COMPANY.gstin}`,
    COMPANY.phone && `Tel: ${COMPANY.phone}`,
    COMPANY.email && `Email: ${COMPANY.email}`,
  ]
    .filter(Boolean)
    .join(' | ');
