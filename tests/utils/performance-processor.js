/**
 * performance-processor.cjs
 * Custom Jest test result processor for performance monitoring
 */

const fs = require('fs');
const path = require('path');

/**
 * Process Jest test results and extract performance metrics
 */
function processResults(results) {
	const performanceData = {
		timestamp: new Date().toISOString(),
		totalTests: results.numTotalTests,
		passedTests: results.numPassedTests,
		failedTests: results.numFailedTests,
		totalTime: results.testResults.reduce((total, result) => total + result.perfStats.end - result.perfStats.start, 0),
		suites: []
	};

	// Process each test suite
	for (const testResult of results.testResults) {
		const suiteData = {
			testFilePath: testResult.testFilePath,
			duration: testResult.perfStats.end - testResult.perfStats.start,
			numTests: testResult.testResults.length,
			numPassingTests: testResult.numPassingTests,
			numFailingTests: testResult.numFailingTests,
			tests: []
		};

		// Process individual tests
		for (const test of testResult.testResults) {
			const testData = {
				title: test.title,
				fullName: test.fullName,
				status: test.status,
				duration: test.duration || 0
			};

			suiteData.tests.push(testData);
		}

		performanceData.suites.push(suiteData);
	}

	// Save performance data
	const outputDir = path.join(process.cwd(), 'coverage', 'performance');
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const outputFile = path.join(outputDir, `performance-${Date.now()}.json`);
	fs.writeFileSync(outputFile, JSON.stringify(performanceData, null, 2));

	// Generate performance summary
	generatePerformanceSummary(performanceData, outputDir);

	// Return results unchanged for Jest
	return results;
}

/**
 * Generate a human-readable performance summary
 */
function generatePerformanceSummary(data, outputDir) {
	const summary = [];
	
	summary.push('# Test Performance Summary');
	summary.push(`Generated: ${data.timestamp}`);
	summary.push('');
	
	summary.push('## Overall Statistics');
	summary.push(`- Total Tests: ${data.totalTests}`);
	summary.push(`- Passed: ${data.passedTests}`);
	summary.push(`- Failed: ${data.failedTests}`);
	summary.push(`- Total Time: ${(data.totalTime / 1000).toFixed(2)}s`);
	summary.push(`- Average Time per Test: ${(data.totalTime / data.totalTests).toFixed(2)}ms`);
	summary.push('');

	// Sort suites by duration (slowest first)
	const sortedSuites = data.suites.sort((a, b) => b.duration - a.duration);

	summary.push('## Slowest Test Suites');
	for (let i = 0; i < Math.min(10, sortedSuites.length); i++) {
		const suite = sortedSuites[i];
		const fileName = path.basename(suite.testFilePath);
		summary.push(`${i + 1}. ${fileName}: ${(suite.duration / 1000).toFixed(2)}s (${suite.numTests} tests)`);
	}
	summary.push('');

	// Find slowest individual tests
	const allTests = data.suites.flatMap(suite => 
		suite.tests.map(test => ({
			...test,
			suite: path.basename(suite.testFilePath)
		}))
	);
	const slowestTests = allTests
		.filter(test => test.duration > 0)
		.sort((a, b) => b.duration - a.duration)
		.slice(0, 10);

	summary.push('## Slowest Individual Tests');
	for (let i = 0; i < slowestTests.length; i++) {
		const test = slowestTests[i];
		summary.push(`${i + 1}. ${test.suite} - ${test.title}: ${test.duration}ms`);
	}
	summary.push('');

	// Performance warnings
	summary.push('## Performance Warnings');
	const slowSuites = sortedSuites.filter(suite => suite.duration > 5000);
	const slowTests = allTests.filter(test => test.duration > 1000);

	if (slowSuites.length > 0) {
		summary.push(`⚠️  ${slowSuites.length} test suite(s) took longer than 5 seconds`);
	}
	if (slowTests.length > 0) {
		summary.push(`⚠️  ${slowTests.length} individual test(s) took longer than 1 second`);
	}
	if (data.totalTime > 60000) {
		summary.push(`⚠️  Total test time exceeded 1 minute (${(data.totalTime / 1000).toFixed(2)}s)`);
	}
	if (slowSuites.length === 0 && slowTests.length === 0 && data.totalTime <= 60000) {
		summary.push('✅ No performance issues detected');
	}

	const summaryFile = path.join(outputDir, 'performance-summary.md');
	fs.writeFileSync(summaryFile, summary.join('\n'));
}

module.exports = processResults;
