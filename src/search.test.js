const glob = require('glob');

test('walk dir for all markdown file', () => {
  const patten = `repos/yuekcc/docs/**/*.md`;

  return new Promise(resolve => {
    glob(patten, (err, files) => {
      console.log(files);
      resolve();
    });
  });
});
