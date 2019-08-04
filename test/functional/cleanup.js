import test from 'tape';

export default function cleanup() {
  test('force kill amplify process', (t) => {
    t.end();
    process.exit(0);
  });
}
