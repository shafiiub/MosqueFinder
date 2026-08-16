'use strict';

const {
  preflightBuild,
  generateSuburbPages,
  copyDataFiles,
  generateStatePrayerTimeSitemap,
  generateStateLists,
  generateMosqueDetails,
  runCli,
} = require('./generator-core');

runCli(async () => {
  await preflightBuild();
  await generateSuburbPages();
  await copyDataFiles();
  await generateStatePrayerTimeSitemap();
  await generateStateLists();
  await generateMosqueDetails();
});
