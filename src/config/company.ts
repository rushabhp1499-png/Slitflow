// Progressive Enterprises' own details, printed on challans, PDFs, emails and the footer.
// Edit this one file to change them everywhere. Leave a value as '' to hide it.
export const COMPANY = {
  name: 'PROGRESSIVE ENTERPRISES',
  tagline: 'Precision Slitting Works',
  address: 'Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302',
  gstin: '27AAPFP2606N1ZR',
  phone: '+91 93267 37273',
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
