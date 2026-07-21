const major = Number(process.versions.node.split(".")[0]);

if (major !== 22) {
  console.error(`Mobile builds require Node.js 22.x; current runtime is ${process.version}.`);
  process.exitCode = 1;
} else {
  console.log(`OK   mobile build runtime ${process.version}.`);
}
