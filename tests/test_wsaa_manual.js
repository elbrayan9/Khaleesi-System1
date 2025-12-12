const { LoginTicket } = require('afip-apis');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function test() {
  console.log('Testing LoginTicket...');

  // Create dummy cert/key files
  const tempDir = os.tmpdir();
  const certPath = path.join(tempDir, 'test.crt');
  const keyPath = path.join(tempDir, 'test.key');

  fs.writeFileSync(certPath, 'DUMMY CERT CONTENT');
  fs.writeFileSync(keyPath, 'DUMMY KEY CONTENT');

  console.log('Created dummy files at:', certPath, keyPath);

  try {
    const ticket = new LoginTicket();
    const tra = await ticket.generateTRA('ws_sr_padron_a13', 3600);
    console.log('TRA generated');

    console.log('Generating CMS with paths...');
    const cms = await ticket.generateCMS(tra, certPath, keyPath);
    console.log('CMS generated successfully');
  } catch (error) {
    console.error('Error generating CMS:', error);
  } finally {
    // Cleanup
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath);
    if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath);
  }
}

test();
