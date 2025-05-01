if (!process.versions)
  // @ts-expect-error
  process.versions = {};

process.versions.node = '20.0.0';

if (!process.argv)
  process.argv = [];

// @ts-expect-error
process.version = '20.0.0';

if (!process.on)
  // @ts-expect-error
  process.on = () => {};

if (!process.env)
  process.env = {};
