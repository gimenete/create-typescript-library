#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process = require("child_process");
const colors = require("colors");
const fs = require("fs-extra");
const inquirer = require("inquirer");
const path = require("path");
const rimraf = require("rimraf");
var rumtime;
(function (rumtime) {
    rumtime["WEBAPP"] = "Web application";
    rumtime["NODEJS"] = "Node.js application";
})(rumtime || (rumtime = {}));
var appType;
(function (appType) {
    appType["LIBRARY"] = "Library";
    appType["STANDALONE"] = "Standalone application";
})(appType || (appType = {}));
// tslint:disable-next-line:no-var-requires
const dashify = require('dashify');
// tslint:disable-next-line:no-var-requires
const replace = require("replace-in-file");
// Note: These should all be relative to the project root directory
const rmDirs = [
    ".git"
];
const rmFiles = [
    ".all-contributorsrc",
    ".gitattributes",
    "tools/init.ts"
];
const modifyFiles = [
    "LICENSE",
    "package.json",
    "rollup.config.ts",
    "test/library.test.ts",
    "tools/gh-pages-publish.ts"
];
const renameFiles = [
    ["src/library.ts", "src/--libraryname--.ts"],
    ["test/library.test.ts", "test/--libraryname--.test.ts"]
];
const dirName = process.argv[2];
if (!dirName) {
    console.error('You must provide a directory name as argument');
    process.exit(1);
}
const basedir = path.join(process.cwd(), dirName);
const exec = (command, options) => {
    console.log(command);
    return new Promise((resolve, reject) => {
        const opts = Object.assign({ shell: true }, options);
        child_process.exec(command, opts, (err, stdout, stderr) => {
            if (stderr)
                console.error(stderr);
            if (stdout)
                console.log(stdout);
            if (err)
                return reject(err);
            resolve(stdout);
        });
    });
};
const rm = (dir) => {
    return new Promise((resolve, reject) => {
        rimraf(dir, (err) => err ? reject(err) : resolve());
    });
};
;
(() => __awaiter(this, void 0, void 0, function* () {
    try {
        const answers = yield inquirer.prompt([
            {
                name: 'library',
                type: 'string',
                message: 'What do you want the library to be called?',
                default: path.basename(dirName),
                filter: (name) => dashify(name)
            },
            {
                name: 'rumtime',
                type: 'list',
                message: 'Is this a web app or a Node.js app?',
                choices: [rumtime.WEBAPP, rumtime.NODEJS],
                default: rumtime.WEBAPP
            },
            {
                name: 'appType',
                type: 'list',
                message: 'Is this a library?',
                choices: [appType.LIBRARY, appType.STANDALONE],
                default: appType.LIBRARY
            },
            {
                name: 'coveralls',
                type: 'confirm',
                message: 'Do you want to use coveralls?'
            },
            {
                name: 'travis',
                type: 'confirm',
                message: 'Do you want to use travis?'
            },
            {
                name: 'commitizen',
                type: 'confirm',
                message: 'Do you want to use commitizen?'
            }
        ]);
        yield setupLibrary(answers);
    }
    catch (err) {
        console.error(err);
    }
}))();
/**
 * Calls all of the functions needed to setup the library
 *
 * @param answers
 */
function setupLibrary(answers) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(colors.cyan("\nThanks for the info. The last few changes are being made... hang tight!\n\n"));
        const repo = 'https://github.com/alexjoverm/typescript-library-starter.git';
        const command = `git clone ${repo} ${basedir} --depth 1`;
        yield exec(command);
        // Get the Git username and email before the .git directory is removed
        const username = (yield exec("git config user.name")).trim();
        const usermail = (yield exec("git config user.email")).trim();
        yield removeItems();
        yield modifyContents(answers.library, username, usermail);
        yield modifyAdditionalFiles(answers);
        yield renameItems(answers.library);
        yield finalize();
        console.log(colors.cyan("OK, you're all set. Happy coding!! ;)\n"));
    });
}
/**
 * Removes items from the project that aren't needed after the initial setup
 */
function removeItems() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(colors.underline.white("Removed"));
        // The directories and files are combined here, to simplify the function,
        // as the 'rm' command checks the item type before attempting to remove it
        const rmItems = rmDirs.concat(rmFiles);
        yield Promise.all(rmItems.map(f => rm(path.resolve(basedir, f))));
        console.log(colors.red(rmItems.join("\n")));
        console.log("\n");
    });
}
/**
 * Updates the contents of the template files with the library name or user details
 *
 * @param libraryName
 * @param username
 * @param usermail
 */
function modifyContents(libraryName, username, usermail) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(colors.underline.white("Modified"));
        const files = modifyFiles.map(f => path.resolve(basedir, f));
        try {
            const changes = replace.sync({
                files,
                from: [/--libraryname--/g, /--username--/g, /--usermail--/g],
                to: [libraryName, username, usermail]
            });
            console.log(colors.yellow(modifyFiles.join("\n")));
        }
        catch (error) {
            console.error("An error occurred modifying the file: ", error);
        }
        console.log("\n");
    });
}
/**
 * Renames any template files to the new library name
 *
 * @param libraryName
 */
function renameItems(libraryName) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(colors.underline.white("Renamed"));
        for (const files of renameFiles) {
            // Files[0] is the current filename
            // Files[1] is the new name
            console.log('files', files);
            const newFilename = files[1].replace(/--libraryname--/g, libraryName);
            yield fs.rename(path.resolve(basedir, files[0]), path.resolve(basedir, newFilename));
            console.log(colors.cyan(files[0] + " => " + newFilename));
        }
        console.log("\n");
    });
}
function modifyAdditionalFiles(answers) {
    return __awaiter(this, void 0, void 0, function* () {
        const jsonPackage = path.resolve(basedir, "package.json");
        const pkg = JSON.parse(yield fs.readFile(jsonPackage, 'utf8'));
        // Remove post-install command
        delete pkg.scripts.postinstall;
        if (answers.rumtime === rumtime.NODEJS) {
            delete pkg.module;
            delete pkg.scripts.prebuild;
            pkg.main = `dist/${answers.library}.js`;
            pkg.scripts.build = pkg.scripts.build.replace('&& rollup -c rollup.config.ts && rimraf compiled ', '');
            pkg.scripts.start = 'tsc -w';
            delete pkg.devDependencies.rollup;
            delete pkg.devDependencies.rimraf;
            delete pkg.devDependencies['rollup-plugin-commonjs'];
            delete pkg.devDependencies['rollup-plugin-node-resolve'];
            delete pkg.devDependencies['rollup-plugin-sourcemaps'];
            yield fs.unlink(path.join(basedir, 'rollup.config.ts'));
        }
        else {
            delete pkg.devDependencies['@types/node'];
        }
        if (!answers.commitizen) {
            delete pkg.scripts.commit;
            delete pkg.scripts['semantic-release'];
            delete pkg.scripts['semantic-release-prepare'];
            delete pkg.devDependencies.commitizen;
            delete pkg.devDependencies['semantic-release'];
            delete pkg.devDependencies['validate-commit-msg'];
            delete pkg.devDependencies['cz-conventional-changelog'];
            delete pkg.config;
        }
        if (!answers.coveralls) {
            delete pkg.scripts['report-coverage'];
            delete pkg.devDependencies.coveralls;
        }
        delete pkg.devDependencies.prompt;
        delete pkg.devDependencies.colors;
        delete pkg.devDependencies['replace-in-file'];
        delete pkg.devDependencies['lodash.camelcase'];
        if (!answers.travis) {
            yield fs.unlink(path.join(basedir, '.travis.yml'));
        }
        yield fs.unlink(path.join(basedir, 'code-of-conduct.md'));
        yield rm(path.join(basedir, 'tools'));
        yield fs.writeFile(jsonPackage, JSON.stringify(pkg, null, 2));
        const tsconfigPath = path.resolve(basedir, "tsconfig.json");
        const tsconfig = JSON.parse(yield fs.readFile(tsconfigPath, 'utf8'));
        if (answers.appType === appType.STANDALONE) {
            delete tsconfig.compilerOptions.declaration;
            delete tsconfig.compilerOptions.declarationDir;
        }
        if (answers.rumtime === rumtime.NODEJS) {
            tsconfig.compilerOptions.lib = tsconfig.compilerOptions.lib.filter((lib) => lib !== 'dom');
            tsconfig.compilerOptions.module = 'commonjs';
            tsconfig.compilerOptions.outDir = 'dist';
        }
        yield fs.writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2));
    });
}
/**
 * Calls any external programs to finish setting up the library
 */
function finalize() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(colors.underline.white("Finalizing"));
        // Recreate Git folder
        const gitInitOutput = (yield exec('git init "' + path.resolve(basedir) + '"', { cwd: basedir }));
        console.log(colors.green(gitInitOutput.replace(/(\n|\r)+/g, "")));
        yield exec('npm install', { cwd: basedir });
        console.log("\n");
    });
}
