async function list() {
  try {
    const res = await fetch('http://localhost:2000/api/v2/packages');
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to list packages:', err.message);
  }
}
list();
