const { LoginTicket } = require('afip-apis');
const path = require('path');

console.log(LoginTicket.toString());
console.log('-------------------');
console.log(LoginTicket.prototype.generateCMS.toString());
try {
  const loginTicketPath = require.resolve('afip-apis/dist/lib/LoginTicket');
  console.log('LoginTicket path:', loginTicketPath);
} catch (e) {
  console.log('Error resolving LoginTicket:', e.message);
  // Try to find where afip-apis is
  try {
    const pkg = require.resolve('afip-apis/package.json');
    console.log('Package path:', pkg);
  } catch (e2) {
    console.log('Error resolving package:', e2.message);
  }
}
