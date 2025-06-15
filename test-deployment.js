#!/usr/bin/env node

/**
 * AI Calling System - Deployment Test Suite
 * Validates system readiness for production deployment
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    purple: '\x1b[35m',
    cyan: '\x1b[36m'
};

class DeploymentTester {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    logHeader(message) {
        this.log(`\n🚀 ${message}`, 'purple');
        this.log('='.repeat(50), 'purple');
    }

    logSuccess(message) {
        this.log(`✅ ${message}`, 'green');
        this.results.passed++;
    }

    logError(message) {
        this.log(`❌ ${message}`, 'red');
        this.results.failed++;
    }

    logWarning(message) {
        this.log(`⚠️  ${message}`, 'yellow');
        this.results.warnings++;
    }

    logInfo(message) {
        this.log(`ℹ️  ${message}`, 'blue');
    }

    async checkFileExists(filePath, description) {
        try {
            await fs.access(filePath);
            this.logSuccess(`${description} exists`);
            return true;
        } catch (error) {
            this.logError(`${description} missing: ${filePath}`);
            return false;
        }
    }

    async checkPackageJson() {
        this.logInfo('Checking package.json files...');
        
        // Check root package.json
        const rootPackageExists = await this.checkFileExists('package.json', 'Root package.json');
        
        if (rootPackageExists) {
            try {
                const packageContent = await fs.readFile('package.json', 'utf8');
                const packageData = JSON.parse(packageContent);
                
                // Check required scripts
                const requiredScripts = ['start'];
                for (const script of requiredScripts) {
                    if (packageData.scripts && packageData.scripts[script]) {
                        this.logSuccess(`Script '${script}' defined`);
                    } else {
                        this.logError(`Script '${script}' missing`);
                    }
                }
                
                // Check dependencies
                if (packageData.dependencies) {
                    this.logSuccess(`${Object.keys(packageData.dependencies).length} dependencies defined`);
                } else {
                    this.logWarning('No dependencies defined');
                }
                
            } catch (error) {
                this.logError(`Invalid package.json: ${error.message}`);
            }
        }
        
        // Check frontend package.json
        const frontendPackageExists = await this.checkFileExists('frontend/package.json', 'Frontend package.json');
        
        if (frontendPackageExists) {
            try {
                const packageContent = await fs.readFile('frontend/package.json', 'utf8');
                const packageData = JSON.parse(packageContent);
                
                // Check frontend scripts
                const requiredScripts = ['dev', 'build'];
                for (const script of requiredScripts) {
                    if (packageData.scripts && packageData.scripts[script]) {
                        this.logSuccess(`Frontend script '${script}' defined`);
                    } else {
                        this.logError(`Frontend script '${script}' missing`);
                    }
                }
                
            } catch (error) {
                this.logError(`Invalid frontend package.json: ${error.message}`);
            }
        }
    }

    async checkCriticalFiles() {
        this.logInfo('Checking critical files...');
        
        const criticalFiles = [
            { path: 'server.js', description: 'Main server file' },
            { path: 'deploy.sh', description: 'Deployment script' },
            { path: 'production-deploy.sh', description: 'Production deployment script' },
            { path: '.env.example', description: 'Environment template' },
            { path: 'README.md', description: 'Documentation' },
            { path: 'frontend/index.html', description: 'Frontend entry point' },
            { path: 'frontend/src/main.tsx', description: 'Frontend main file' },
            { path: 'frontend/vite.config.ts', description: 'Vite configuration' }
        ];
        
        for (const file of criticalFiles) {
            await this.checkFileExists(file.path, file.description);
        }
    }

    async checkPackagesDirectory() {
        this.logInfo('Checking packages directory...');
        
        const packagesDir = 'packages';
        try {
            const stats = await fs.stat(packagesDir);
            if (stats.isDirectory()) {
                this.logSuccess('Packages directory exists');
                
                // Check for TW2GEM packages
                const expectedPackages = [
                    'tw2gem-server',
                    'gemini-live-client',
                    'twilio-server',
                    'audio-converter'
                ];
                
                for (const pkg of expectedPackages) {
                    const pkgPath = join(packagesDir, pkg);
                    try {
                        await fs.access(pkgPath);
                        this.logSuccess(`Package '${pkg}' found`);
                    } catch (error) {
                        this.logWarning(`Package '${pkg}' missing`);
                    }
                }
            }
        } catch (error) {
            this.logError('Packages directory missing');
        }
    }

    async checkEnvironmentVariables() {
        this.logInfo('Checking environment variables...');
        
        const requiredEnvVars = [
            { name: 'GEMINI_API_KEY', critical: true },
            { name: 'NODE_ENV', critical: false },
            { name: 'PORT', critical: false }
        ];
        
        for (const envVar of requiredEnvVars) {
            if (process.env[envVar.name]) {
                this.logSuccess(`${envVar.name} is set`);
            } else if (envVar.critical) {
                this.logError(`Critical environment variable ${envVar.name} is missing`);
            } else {
                this.logWarning(`Optional environment variable ${envVar.name} is missing`);
            }
        }
    }

    async checkDeploymentScripts() {
        this.logInfo('Checking deployment scripts...');
        
        const scripts = [
            { path: 'deploy.sh', description: 'Main deployment script' },
            { path: 'production-deploy.sh', description: 'Production deployment script' }
        ];
        
        for (const script of scripts) {
            try {
                const stats = await fs.stat(script.path);
                if (stats.mode & 0o111) {
                    this.logSuccess(`${script.description} is executable`);
                } else {
                    this.logWarning(`${script.description} is not executable`);
                }
            } catch (error) {
                this.logError(`${script.description} missing`);
            }
        }
    }

    async testServerStartup() {
        this.logInfo('Testing server startup...');
        
        return new Promise((resolve) => {
            const serverProcess = spawn('node', ['server.js'], {
                env: { ...process.env, PORT: '0' }, // Use random port
                stdio: ['ignore', 'pipe', 'pipe']
            });
            
            let output = '';
            let errorOutput = '';
            
            serverProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            serverProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            // Kill server after 5 seconds
            setTimeout(() => {
                serverProcess.kill('SIGTERM');
            }, 5000);
            
            serverProcess.on('close', (code) => {
                if (code === 0 || code === null) {
                    this.logSuccess('Server starts successfully');
                } else if (output.includes('Server running') || output.includes('listening')) {
                    this.logSuccess('Server appears to start correctly');
                } else {
                    this.logError(`Server startup failed with code ${code}`);
                    if (errorOutput) {
                        this.logError(`Error output: ${errorOutput.slice(0, 200)}`);
                    }
                }
                resolve();
            });
            
            serverProcess.on('error', (error) => {
                this.logError(`Server startup error: ${error.message}`);
                resolve();
            });
        });
    }

    async checkFrontendBuild() {
        this.logInfo('Checking frontend build capability...');
        
        try {
            // Check if frontend directory exists
            await fs.access('frontend');
            
            // Try to run build command
            return new Promise((resolve) => {
                const buildProcess = spawn('npm', ['run', 'build'], {
                    cwd: 'frontend',
                    stdio: ['ignore', 'pipe', 'pipe']
                });
                
                let output = '';
                let errorOutput = '';
                
                buildProcess.stdout.on('data', (data) => {
                    output += data.toString();
                });
                
                buildProcess.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });
                
                buildProcess.on('close', (code) => {
                    if (code === 0) {
                        this.logSuccess('Frontend builds successfully');
                    } else {
                        this.logError(`Frontend build failed with code ${code}`);
                        if (errorOutput) {
                            this.logError(`Build error: ${errorOutput.slice(0, 200)}`);
                        }
                    }
                    resolve();
                });
                
                buildProcess.on('error', (error) => {
                    this.logError(`Frontend build error: ${error.message}`);
                    resolve();
                });
            });
            
        } catch (error) {
            this.logError('Frontend directory not accessible');
        }
    }

    async runAllTests() {
        this.logHeader('AI Calling System - Deployment Test Suite');
        
        // Run all tests
        await this.checkPackageJson();
        await this.checkCriticalFiles();
        await this.checkPackagesDirectory();
        await this.checkEnvironmentVariables();
        await this.checkDeploymentScripts();
        await this.testServerStartup();
        await this.checkFrontendBuild();
        
        // Show results
        this.logHeader('Test Results Summary');
        
        this.log(`✅ Passed: ${this.results.passed}`, 'green');
        this.log(`❌ Failed: ${this.results.failed}`, 'red');
        this.log(`⚠️  Warnings: ${this.results.warnings}`, 'yellow');
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
        
        this.log(`\n📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');
        
        if (this.results.failed === 0) {
            this.log('\n🎉 System is ready for deployment!', 'green');
            return true;
        } else {
            this.log('\n🔧 System needs attention before deployment', 'red');
            return false;
        }
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new DeploymentTester();
    tester.runAllTests().then((success) => {
        process.exit(success ? 0 : 1);
    }).catch((error) => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
}

export default DeploymentTester;