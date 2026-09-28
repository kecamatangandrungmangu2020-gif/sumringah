async function main() {
  const res = await fetch('http://localhost:3000/bulusari/');
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Snippet:\n', text.slice(0, 1500));
}
main();
