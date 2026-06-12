#!/usr/bin/env node

const { run, reportCliError } = require('../dist/cli.js');

run().catch(reportCliError);
