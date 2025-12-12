const cleanPem = (pem) => {
  if (!pem) return '';

  // Detect type
  let type = '';
  if (pem.includes('PRIVATE KEY')) type = 'PRIVATE KEY';
  else if (pem.includes('CERTIFICATE')) type = 'CERTIFICATE';
  else return pem; // Can't clean unknown type

  console.log(`Type detected: ${type}`);
  console.log(`Original PEM start: ${pem.substring(0, 20)}`);

  // Extract body: remove headers/footers (handling 4 or 5 dashes) and all whitespace
  const regexBegin = new RegExp(`-{4,5}\\s*BEGIN\\s+${type}\\s*-{4,5}`, 'g');
  const regexEnd = new RegExp(`-{4,5}\\s*END\\s+${type}\\s*-{4,5}`, 'g');

  console.log(`Regex Begin: ${regexBegin}`);
  console.log(`Regex End: ${regexEnd}`);
  console.log(`Match Begin: ${pem.match(regexBegin)}`);

  const body = pem
    .replace(regexBegin, '')
    .replace(regexEnd, '')
    .replace(/\s/g, '');

  console.log(`Body length: ${body.length}`);
  console.log(`Body start: ${body.substring(0, 20)}`);

  // Reconstruct with correct 5-dash headers and 64-char line breaks
  const formattedBody = body.match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${type}-----\n${formattedBody}\n-----END ${type}-----`;
};

const testPem = `----BEGIN CERTIFICATE----
MII...
----END CERTIFICATE----`;

const result = cleanPem(testPem);
console.log('Result start:', result.substring(0, 30));
