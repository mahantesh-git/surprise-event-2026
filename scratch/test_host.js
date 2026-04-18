const hostTest = (input) => {
  let host = input;
  if (host) {
    if (!host.startsWith('http') && !host.startsWith('//')) {
      host = `https://${host}`;
    }
    
    try {
      const url = new URL(host);
      console.log('Hostname:', url.hostname);
      console.log('Includes dot:', url.hostname.includes('.'));
      if (!url.hostname.includes('.') && url.hostname !== 'localhost' && !url.hostname.includes(':')) {
        host = host.replace(url.hostname, `${url.hostname}.onrender.com`);
      }
    } catch (e) {
      console.log('Error:', e.message);
      if (!host.includes('.') && !host.includes('localhost') && !host.includes('://localhost')) {
        host = `${host}.onrender.com`;
      }
    }
  }
  return host.endsWith('/api') ? host : `${host}/api`;
};

console.log('Result 1:', hostTest('quest-backend-7bwq'));
console.log('Result 2:', hostTest('localhost'));
console.log('Result 3:', hostTest('https://quest-backend-7bwq.onrender.com'));
