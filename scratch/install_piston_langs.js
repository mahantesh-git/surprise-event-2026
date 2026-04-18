async function setup() {
  const languages = [
    { language: 'python', version: '3.10.0' },
    { language: 'javascript', version: '18.15.0' }
  ];

  for (const lang of languages) {
    try {
      console.log(`Installing ${lang.language}...`);
      const res = await fetch('http://localhost:2000/api/v2/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lang)
      });
      const data = await res.json();
      console.log(`Result for ${lang.language}:`, data);
    } catch (err) {
      console.error(`Failed to install ${lang.language}:`, err.message);
    }
  }
}

setup();
