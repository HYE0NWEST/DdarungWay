/**
 * Jest 설정 파일
 */
module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/utils/logger.js',
        '!src/config/swagger.js'
    ],
    testTimeout: 10000,
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    verbose: true
};
