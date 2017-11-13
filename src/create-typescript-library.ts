#!/usr/bin/env node

import * as child_process from 'child_process'
import * as colors from "colors"
import * as fs from 'fs-extra'
import * as inquirer from "inquirer"
import * as path from "path"
import * as rimraf from 'rimraf'

// tslint:disable-next-line:no-var-requires
const dashify = require('dashify')
// tslint:disable-next-line:no-var-requires
const replace = require("replace-in-file")

// Note: These should all be relative to the project root directory
const rmDirs = [
  ".git"
]
const rmFiles = [
  ".all-contributorsrc",
  ".gitattributes",
  "tools/init.ts"
]
const modifyFiles = [
  "LICENSE",
  "package.json",
  "rollup.config.ts",
  "test/library.test.ts",
  "tools/gh-pages-publish.ts"
]
const renameFiles = [
  ["src/library.ts", "src/--libraryname--.ts"],
  ["test/library.test.ts", "test/--libraryname--.test.ts"]
]

const dirName = process.argv[2]
if (!dirName) {
  console.error('You must provide a directory name as argument')
  process.exit(1)
}
const basedir = path.join(process.cwd(), dirName)

const exec = (command: string, options?: child_process.ExecOptions): Promise<string> => {
  console.log(command)
  return new Promise((resolve, reject) => {
    const opts = Object.assign({ shell: true }, options)
    child_process.exec(command, opts, (err, stdout, stderr) => {
      if (stderr) console.error(stderr)
      if (stdout) console.log(stdout)
      if (err) return reject(err)
      resolve(stdout as string)
    })
  })
}

const rm = (dir: string) => {
  return new Promise((resolve, reject) => {
    rimraf(dir, (err: any) => err ? reject(err) : resolve())
  })
}

interface IAnswers {
  library: string,
  rollup: boolean,
  coveralls: boolean,
  travis: boolean,
  commitizen: boolean
}

;(async () => {
  try {
    const answers = await inquirer.prompt([
      {
        name: 'library',
        type: 'string',
        message: 'What do you want the library to be called?',
        default: path.basename(dirName),
        filter: (name: string) => dashify(name)
      },
      {
        name: 'rollup',
        type: 'list',
        message: 'Is this a web app or a Node.js app?',
        choices: ['webapp', 'nodejs'],
        default: 'webapp'
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
    ])

    await setupLibrary(answers as IAnswers)

  } catch (err) {
    console.error(err)
  }
})()


/**
 * Calls all of the functions needed to setup the library
 *
 * @param answers
 */
async function setupLibrary(answers: IAnswers) {
  console.log(
    colors.cyan(
      "\nThanks for the info. The last few changes are being made... hang tight!\n\n"
    )
  )

  const repo = 'https://github.com/alexjoverm/typescript-library-starter.git'
  const command = `git clone ${repo} ${basedir} --depth 1`
  await exec(command)

  // Get the Git username and email before the .git directory is removed
  const username = (await exec("git config user.name")).trim()
  const usermail = (await exec("git config user.email")).trim()

  await removeItems()

  await modifyContents(answers.library, username, usermail)

  await renameItems(answers.library)

  await finalize()

  console.log(colors.cyan("OK, you're all set. Happy coding!! ;)\n"))
}

/**
 * Removes items from the project that aren't needed after the initial setup
 */
async function removeItems() {
  console.log(colors.underline.white("Removed"))

  // The directories and files are combined here, to simplify the function,
  // as the 'rm' command checks the item type before attempting to remove it
  const rmItems = rmDirs.concat(rmFiles)
  await Promise.all(
    rmItems.map(f => rm(path.resolve(basedir, f)))
  )
  console.log(colors.red(rmItems.join("\n")))

  console.log("\n")
}

/**
 * Updates the contents of the template files with the library name or user details
 *
 * @param libraryName
 * @param username
 * @param usermail
 */
async function modifyContents(libraryName: string, username: string, usermail: string) {
  console.log(colors.underline.white("Modified"))

  const files = modifyFiles.map(f => path.resolve(basedir, f))
  try {
    const changes = replace.sync({
      files,
      from: [/--libraryname--/g, /--username--/g, /--usermail--/g],
      to: [libraryName, username, usermail]
    })
    console.log(colors.yellow(modifyFiles.join("\n")))
  } catch (error) {
    console.error("An error occurred modifying the file: ", error)
  }

  console.log("\n")
}

/**
 * Renames any template files to the new library name
 *
 * @param libraryName
 */
async function renameItems(libraryName: string) {
  console.log(colors.underline.white("Renamed"))

  for (const files of renameFiles) {
    // Files[0] is the current filename
    // Files[1] is the new name
    console.log('files', files)
    const newFilename = files[1].replace(/--libraryname--/g, libraryName)
    await fs.rename(
      path.resolve(basedir, files[0]),
      path.resolve(basedir, newFilename)
    )
    console.log(colors.cyan(files[0] + " => " + newFilename))
  }

  console.log("\n")
}

/**
 * Calls any external programs to finish setting up the library
 */
async function finalize() {
  console.log(colors.underline.white("Finalizing"))

  // Recreate Git folder
  const gitInitOutput = (await exec('git init "' + path.resolve(basedir) + '"', { cwd: basedir }))
  console.log(colors.green(gitInitOutput.replace(/(\n|\r)+/g, "")))

  // Remove post-install command
  const jsonPackage = path.resolve(basedir, "package.json")
  const pkg = JSON.parse(await fs.readFile(jsonPackage, 'utf8'))

  // Note: Add items to remove from the package file here
  delete pkg.scripts.postinstall

  await fs.writeFile(jsonPackage, JSON.stringify(pkg, null, 2))
  console.log(colors.green("Postinstall script has been removed"))

  await exec('npm install', { cwd: basedir })

  console.log("\n")
}
