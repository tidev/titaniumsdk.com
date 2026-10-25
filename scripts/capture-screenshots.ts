import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp, { type OverlayOptions } from 'sharp';

/**
 * Builds a snippet into a throwaway app, runs it on a simulator or emulator,
 * and saves a cropped screenshot.
 *
 *   node scripts/capture-screenshots.ts --platform ios
 *   node scripts/capture-screenshots.ts --platform both --shot list-view
 *   node scripts/capture-screenshots.ts --platform both --theme both
 *
 * The reason to script this rather than shoot by hand is not the tedium, it is
 * that the conventions in `docs/image-inventory.md` then enforce themselves.
 * The status bar is overridden to a fixed clock and full battery, the device is
 * a constant, and light and dark are a loop rather than twice the work. A
 * reshoot after an SDK change costs a command instead of an afternoon.
 *
 * A warm run is about 25 seconds a shot, nearly all of it the incremental
 * build, so the harness project is deliberately left in place between runs.
 *
 * ## How a shot knows when it is ready
 *
 * Launch is not ready: layout, image decoding and animation all finish later.
 * The harness prepends a preamble to the snippet that wraps
 * `Ti.UI.createWindow` and logs a marker once layout has been quiet for a
 * moment. The marker carries the screen geometry, so the crop needs no table
 * of device sizes. A timer fires it anyway if the hook fails, so a snippet
 * that never lays out still produces a picture rather than hanging the run.
 *
 * ## Two identifiers per Android device
 *
 * `adb` wants the serial, `ti build -T emulator` wants the AVD name and
 * rejects the serial outright, so both are resolved up front and used in
 * different places. The serial comes from `adb devices` and the name from
 * `adb emu avd name`.
 *
 * ## Known limits
 *
 * Android needs an emulator already running, because booting one reliably is a
 * different problem from taking a picture. `emulator -list-avds` then
 * `emulator -avd <name>`.
 *
 * Nothing here covers the shots that are not a snippet in a window: the
 * notification shade, the camera overlay, the launcher icon, anything in an
 * IDE. Those stay manual. `docs/image-inventory.md` says which are which.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SHOTS_DIR = join(ROOT, 'scripts', 'shots');

/**
 * Where a composed shot's per-platform halves are kept. They are intermediate,
 * so they stay out of the output directory, which is somewhere committed.
 */
const PARTS_DIR = join(tmpdir(), 'ti-shot-parts');

/** Not the selected SDK: the CLI picks the latest GA, which is 13.4.1. */
const DEFAULT_SDK = '14.0.0';

/**
 * One device per platform, so scale does not wander from page to page. The
 * inventory asks for an iPhone 16, which this machine no longer has; an
 * iPhone 17 is the same 393x852pt screen under a new name.
 */
const DEFAULT_IOS_DEVICE = 'iPhone 17 Pro Max';

/** 9:41 is the clock Apple puts in its own marketing shots. */
const STATUS_BAR_TIME = '9:41';

const MARKER = 'TI_SHOT_READY';

/** The harness app's id. Stage commands write it as `{app}`. */
const APP_ID = 'com.titaniumsdk.shots';

type Platform = 'ios' | 'android';
type Theme = 'light' | 'dark';

/** An `adb shell` command, or a number of milliseconds to wait. */
type Step = string | number;

/**
 * The slice of the screen worth keeping, full width, in the units the snippet
 * lays out in: points on iOS, dp on Android.
 */
interface Band {
  top: number;
  height: number;
}

interface Shot {
  /** Output basename, and the name of the `.js` file beside `shots.json`. */
  id: string;
  platforms: Platform[];
  themes?: Theme[];
  /**
   * One band for both platforms, or one each where they differ. A navigation
   * bar and an action bar do not sit at the same height, so a shot of one
   * cannot use a single crop. Omit to keep the whole screen.
   */
  crop?: Band | { ios?: Band; android?: Band };
  /**
   * Stitch these platforms into one image side by side, which is what a shot
   * whose whole point is the comparison wants: tabs would hide half of it
   * behind a click. The halves are written to `PARTS_DIR` and only the
   * composite reaches the output directory.
   */
  compose?: Platform[];
  /**
   * How the halves are stacked. Two tall panes go side by side; two wide short
   * ones go one above the other, because side by side they would be a 7:1
   * strip that renders about 100px tall in the prose and cannot be read.
   */
  composeAxis?: 'row' | 'column';
  /**
   * Scale the finished image down to at most this wide. For a shot whose
   * subject is the whole screen rather than a band, this is how it earns its
   * place in a 700px column without being a storey tall.
   */
  maxWidth?: number;
  /** Milliseconds of quiet after the last layout before the shot is taken. */
  settle?: number;
  /** Modules the snippet requires, added to the harness tiapp.xml. */
  modules?: { name: string; platform: 'iphone' | 'android' }[];
  /**
   * Permissions the snippet needs. They are declared in the manifest and
   * granted with `pm grant`, because the alternative is a system dialog that
   * someone has to tap.
   */
  androidPermissions?: string[];
  /**
   * Run after the app reports ready and before the screenshot, for a picture
   * of something that is not the app's own window. Strings are `adb shell`
   * commands, numbers are waits in milliseconds, and `{app}` is the app id.
   */
  androidStage?: Step[];
  /** What the picture is for, so a stray file in `out/` can be traced back. */
  note?: string;
}

interface Options {
  platforms: Platform[];
  themes: Theme[];
  only: string | null;
  out: string;
  projectDir: string;
  sdk: string;
  iosDevice: string;
  androidSerial: string | null;
  javaHome: string | null;
  keep: boolean;
  /** Skip cropping and composing, to see what a new shot actually renders. */
  full: boolean;
  /** Recompose from the halves already in PARTS_DIR, building nothing. */
  composeOnly: boolean;
}

/** `adb` talks to the serial, `ti build` talks to the AVD name. */
interface Device {
  serial: string;
  buildTarget: string;
}

interface Ready {
  /** Screen width in the units the snippet lays out in. */
  width: number;
  density: number;
}

function parseArgs(argv: string[]): Options {
  const get = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : (argv[i + 1] ?? null);
  };

  const platform = get('--platform') ?? 'ios';
  const theme = get('--theme') ?? 'light';

  return {
    platforms: platform === 'both' ? ['ios', 'android'] : [platform as Platform],
    themes: theme === 'both' ? ['light', 'dark'] : [theme as Theme],
    only: get('--shot'),
    out: get('--out') ?? join(ROOT, 'public', 'docs', 'guides'),
    projectDir: get('--project-dir') ?? join(tmpdir(), 'ti-shot-harness'),
    sdk: get('--sdk') ?? DEFAULT_SDK,
    iosDevice: get('--ios-device') ?? DEFAULT_IOS_DEVICE,
    androidSerial: get('--android-device'),
    javaHome: get('--java-home'),
    keep: argv.includes('--keep'),
    full: argv.includes('--full'),
    composeOnly: argv.includes('--compose-only'),
  };
}

function run(cmd: string, args: string[], allowFailure = false): string {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    if (allowFailure) return '';
    throw err;
  }
}

/**
 * Wraps the snippet so it announces itself once laid out.
 *
 * The marker fires a settle after the *last* layout rather than the first,
 * because a snippet may open a second window, a list may still be filling its
 * rows, or an image may not have decoded. Every `postlayout` on any window the
 * snippet creates pushes the timer back. A snippet that animates forever would
 * never settle, so the hard cap further down fires it anyway.
 */
function preamble(id: string, settle: number): string {
  return `// Added by scripts/capture-screenshots.ts. Not part of the snippet.
(function () {
  var fired = false;
  function ready() {
    if (fired) { return; }
    fired = true;
    var caps = Ti.Platform.displayCaps;
    Ti.API.info('${MARKER} ${id} ' + caps.platformWidth + ' ' + (caps.logicalDensityFactor || 1));
  }
  var timer = null;
  function nudge() {
    if (fired) { return; }
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(ready, ${settle});
  }
  try {
    var create = Ti.UI.createWindow;
    Ti.UI.createWindow = function (params) {
      var win = create.call(Ti.UI, params);
      win.addEventListener('postlayout', nudge);
      return win;
    };
  } catch (e) {
    Ti.API.warn('harness: could not hook createWindow, falling back to a timer: ' + e);
  }
  setTimeout(ready, ${settle + 15000});
})();

`;
}

function ensureProject(options: Options): string {
  const dir = join(options.projectDir, 'Hello');
  if (existsSync(dir)) return dir;

  mkdirSync(options.projectDir, { recursive: true });
  console.log(`Creating harness project in ${dir}`);
  run('ti', [
    'create',
    '--no-banner',
    '--no-prompt',
    '-s',
    options.sdk,
    '-t',
    'app',
    '-n',
    'Hello',
    '--id',
    APP_ID,
    '-p',
    'ios,android',
    '-d',
    options.projectDir,
  ]);
  return dir;
}

/**
 * Adds whatever the chosen shots need to the harness tiapp.xml.
 *
 * Applied for the whole run rather than per shot, so switching between shots
 * does not churn the manifest and force a full rebuild each time. Everything
 * added is inert for the shots that do not use it.
 */
function ensureProjectNeeds(projectDir: string, shots: Shot[]): void {
  const file = join(projectDir, 'tiapp.xml');
  const before = readFileSync(file, 'utf8');
  let xml = before;

  // `ti create` writes CRLF, so neither the match nor the inserted line can
  // assume a bare newline.
  const eol = xml.includes('\r\n') ? '\r\n' : '\n';

  for (const shot of shots) {
    for (const module of shot.modules ?? []) {
      const tag = `<module platform="${module.platform}">${module.name}</module>`;
      if (!xml.includes(tag)) {
        xml = xml.replace(/([ \t]*<modules>\r?\n)/, `$1\t\t${tag}${eol}`);
      }
    }
    for (const permission of shot.androidPermissions ?? []) {
      const tag = `<uses-permission android:name="${permission}"/>`;
      if (!xml.includes(tag)) {
        xml = xml.replace(/(<manifest[^>]*>\r?\n)/, `$1\t\t\t${tag}${eol}`);
      }
    }
  }

  if (xml !== before) {
    writeFileSync(file, xml);
    console.log('Updated tiapp.xml for this run');
  }
}

async function stageAndroid(device: Device, shot: Shot): Promise<void> {
  const adb = adbPath();
  for (const permission of shot.androidPermissions ?? []) {
    run(adb, ['-s', device.serial, 'shell', 'pm', 'grant', APP_ID, permission], true);
  }

  for (const step of shot.androidStage ?? []) {
    if (typeof step === 'number') {
      await new Promise((resolve) => setTimeout(resolve, step));
      continue;
    }
    run(adb, ['-s', device.serial, 'shell', step.replaceAll('{app}', APP_ID)], true);
  }
}

function adbPath(): string {
  const configured = run('ti', ['config', 'android.sdkPath'], true).trim();
  const sdk = configured || join(homedir(), 'Library', 'Android', 'sdk');
  const adb = join(sdk, 'platform-tools', 'adb');
  if (!existsSync(adb))
    throw new Error(`No adb at ${adb}. Set it with 'ti config android.sdkPath'.`);
  return adb;
}

/**
 * The newest JDK the Gradle in SDK 14 can run on. It ships Gradle 9.4.1, which
 * is happy on 25 and dies on 27 with "Unsupported class file major version 71".
 */
const MAX_JDK = 25;

function jdkMajor(home: string): number | null {
  try {
    const release = readFileSync(join(home, 'release'), 'utf8');
    const match = release.match(/^JAVA_VERSION="(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Finds a JDK the Android build can actually use.
 *
 * An inherited JAVA_HOME wins when Gradle can run on it, so a machine that has
 * been set up deliberately is left alone. It is checked rather than trusted
 * because the usual way to set it is the unversioned `/opt/homebrew/opt/openjdk`,
 * which follows Homebrew to whatever is newest and silently becomes too new.
 * Falling back beats failing several minutes into a build with a Groovy error
 * that names no JDK.
 */
let cachedJavaHome: string | null = null;

function androidJavaHome(explicit: string | null): string {
  if (cachedJavaHome) return cachedJavaHome;

  if (explicit) {
    const major = jdkMajor(explicit);
    if (major === null) throw new Error(`No JDK at ${explicit}`);
    if (major > MAX_JDK)
      throw new Error(`The JDK at ${explicit} is ${major}; Gradle needs ${MAX_JDK} or older.`);
    cachedJavaHome = explicit;
    return explicit;
  }

  const versions = ['25', '21', '17'];
  const candidates = [
    process.env.JAVA_HOME ?? null,
    ...versions.map(
      (version) => run('/usr/libexec/java_home', ['-v', version], true).trim() || null
    ),
    ...versions.map((version) => `/opt/homebrew/opt/openjdk@${version}`),
  ];

  for (const home of candidates) {
    if (!home || !existsSync(home)) continue;
    const major = jdkMajor(home);
    if (major !== null && major <= MAX_JDK) {
      cachedJavaHome = home;
      return home;
    }
  }

  throw new Error(
    `No JDK ${MAX_JDK} or older found, and Gradle cannot run on a newer one. 'brew install openjdk@21'.`
  );
}

function resolveDevice(platform: Platform, options: Options): Device {
  if (platform === 'ios') {
    const json = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'available', '--json']));
    for (const runtime of Object.keys(json.devices)) {
      for (const device of json.devices[runtime]) {
        if (device.name === options.iosDevice)
          return { serial: device.udid, buildTarget: device.udid };
      }
    }
    throw new Error(
      `No available simulator named ${options.iosDevice}. 'xcrun simctl list devices available' lists them.`
    );
  }

  const adb = adbPath();
  const attached = run(adb, ['devices'], true)
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t')[0].trim())
    .filter(Boolean);
  const serial = options.androidSerial ?? attached[0];
  if (!serial)
    throw new Error(
      "No Android device or emulator attached. Start one with 'emulator -avd <name>'."
    );

  const name = run(adb, ['-s', serial, 'emu', 'avd', 'name'], true).split('\n')[0].trim();
  return { serial, buildTarget: name || serial };
}

/**
 * A real clock and battery level date an image and leak the machine it was
 * taken on, so both platforms get a fixed one. Android's is the system UI demo
 * mode, which has to be allowed before it will listen.
 */
function prepareDevice(platform: Platform, device: Device, theme: Theme): void {
  if (platform === 'ios') {
    run('xcrun', ['simctl', 'boot', device.serial], true);
    run('xcrun', ['simctl', 'bootstatus', device.serial, '-b']);
    run('xcrun', ['simctl', 'ui', device.serial, 'appearance', theme]);
    run('xcrun', [
      'simctl',
      'status_bar',
      device.serial,
      'override',
      '--time',
      STATUS_BAR_TIME,
      '--batteryState',
      'charged',
      '--batteryLevel',
      '100',
      '--wifiMode',
      'active',
      '--wifiBars',
      '3',
      '--cellularMode',
      'active',
      '--cellularBars',
      '4',
      '--dataNetwork',
      'wifi',
    ]);
    return;
  }

  const adb = adbPath();
  const target = ['-s', device.serial];
  run(adb, [...target, 'shell', 'cmd', 'uimode', 'night', theme === 'dark' ? 'yes' : 'no'], true);
  run(adb, [...target, 'shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1'], true);
  const demo = (args: string[]) =>
    run(
      adb,
      [...target, 'shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', ...args],
      true
    );
  demo(['-e', 'command', 'enter']);
  demo(['-e', 'command', 'clock', '-e', 'hhmm', '0941']);
  demo(['-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false']);
  demo(['-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4']);
  demo(['-e', 'command', 'notifications', '-e', 'visible', 'false']);
}

function releaseDevice(platform: Platform, device: Device): void {
  if (platform === 'ios') {
    run('xcrun', ['simctl', 'status_bar', device.serial, 'clear'], true);
    return;
  }
  run(
    adbPath(),
    [
      '-s',
      device.serial,
      'shell',
      'am',
      'broadcast',
      '-a',
      'com.android.systemui.demo',
      '-e',
      'command',
      'exit',
    ],
    true
  );
}

/**
 * Builds and installs, then resolves when the app says it has laid out.
 *
 * `ti build` stays attached streaming the app log, which is the channel the
 * marker comes back on, so the process is killed rather than waited on.
 */
function androidEnv(options: Options): NodeJS.ProcessEnv {
  const javaHome = androidJavaHome(options.javaHome);
  return {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${join(javaHome, 'bin')}:${process.env.PATH ?? ''}`,
  };
}

function runToCompletion(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env });
    let tail = '';
    const onChunk = (chunk: Buffer) => {
      tail = (tail + chunk.toString()).slice(-4000);
    };
    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}:\n${tail}`))
    );
  });
}

/**
 * Android takes the long way round: build only, then install, launch and watch
 * logcat from here.
 *
 * A plain `ti build` hands the emulator to Titanium's EmulatorManager, which
 * waits on `adb track-devices` for a device that is already connected and so
 * never hears about it. The build then fails after two minutes with "Emulator
 * failed to start in a timely manner", having built perfectly well. Driving
 * the install from here sidesteps that, and the harness already owns the
 * emulator for the status bar overrides anyway.
 */
async function buildAndWaitAndroid(
  device: Device,
  projectDir: string,
  options: Options,
  id: string
): Promise<Ready> {
  await runToCompletion(
    'ti',
    [
      'build',
      '--no-banner',
      '--no-prompt',
      '--no-colors',
      '-s',
      options.sdk,
      '-d',
      projectDir,
      '-p',
      'android',
      '-T',
      'emulator',
      '-C',
      device.buildTarget,
      '--build-only',
      '-l',
      'info',
    ],
    androidEnv(options)
  );

  const apk = join(
    projectDir,
    'build',
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'debug',
    'app-debug.apk'
  );
  if (!existsSync(apk)) throw new Error(`The build produced no APK at ${apk}`);

  const adb = adbPath();
  const target = ['-s', device.serial];
  run(adb, [...target, 'install', '-r', apk]);
  run(adb, [...target, 'logcat', '-c'], true);
  run(adb, [...target, 'shell', 'am', 'force-stop', APP_ID], true);

  return new Promise((resolve, reject) => {
    const log = spawn(adb, [...target, 'logcat']);
    let settled = false;
    const finish = (err: Error | null, ready?: Ready) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      log.kill();
      if (err) reject(err);
      else resolve(ready as Ready);
    };
    const timer = setTimeout(
      () => finish(new Error(`${id} never reported ready on Android`)),
      90000
    );

    log.stdout.on('data', (chunk: Buffer) => {
      const pattern = new RegExp(`${MARKER} ${id} (\\d+(?:\\.\\d+)?) (\\d+(?:\\.\\d+)?)`);
      const match = chunk.toString().match(pattern);
      if (match) finish(null, { width: Number(match[1]), density: Number(match[2]) });
    });

    run(
      adb,
      [...target, 'shell', 'monkey', '-p', APP_ID, '-c', 'android.intent.category.LAUNCHER', '1'],
      true
    );
  });
}

function buildAndWait(
  platform: Platform,
  device: Device,
  projectDir: string,
  options: Options,
  id: string
): Promise<Ready> {
  if (platform === 'android') return buildAndWaitAndroid(device, projectDir, options, id);

  const args = [
    'build',
    '--no-banner',
    '--no-prompt',
    '--no-colors',
    '-s',
    options.sdk,
    '-d',
    projectDir,
    '-p',
    'ios',
    '-T',
    'simulator',
    '-C',
    device.buildTarget,
    '-l',
    'info',
  ];

  return new Promise((resolve, reject) => {
    const child = spawn('ti', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let settled = false;
    let tail = '';

    const finish = (err: Error | null, ready?: Ready) => {
      if (settled) return;
      settled = true;
      child.kill('SIGINT');
      if (err) reject(err);
      else resolve(ready as Ready);
    };

    const onChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      tail = (tail + text).slice(-4000);
      const match = text.match(new RegExp(`${MARKER} ${id} (\\d+(?:\\.\\d+)?) (\\d+(?:\\.\\d+)?)`));
      if (match) finish(null, { width: Number(match[1]), density: Number(match[2]) });
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('exit', (code) => {
      if (!settled)
        finish(new Error(`ti build exited with ${code} before ${id} was ready:\n${tail}`));
    });
  });
}

function capture(platform: Platform, device: Device, file: string): void {
  if (platform === 'ios') {
    run('xcrun', ['simctl', 'io', device.serial, 'screenshot', '--type', 'png', file]);
    return;
  }
  const png = execFileSync(adbPath(), ['-s', device.serial, 'exec-out', 'screencap', '-p'], {
    maxBuffer: 64 * 1024 * 1024,
  });
  writeFileSync(file, png);
}

function bandFor(shot: Shot, platform: Platform): Band | null {
  const crop = shot.crop;
  if (!crop) return null;
  if ('top' in crop) return crop;
  return crop[platform] ?? null;
}

/**
 * Crops to the band the snippet draws in, full width.
 *
 * A whole portrait screenshot cannot be used in the prose at any scale: at a
 * readable width it is 1500px tall, and at the height the page allows it is
 * 190px wide.
 */
async function cropBand(file: string, shot: Shot, ready: Ready, platform: Platform): Promise<void> {
  const band = bandFor(shot, platform);
  if (!band) return;

  const { width, height } = await sharp(file).metadata();
  if (!width || !height) throw new Error(`Could not read the size of ${file}`);

  // iOS reports points, so the ratio gives the scale. Android reports pixels
  // already, and the snippet's numbers are dp, so the density is the scale.
  const scale = platform === 'ios' ? width / ready.width : ready.density;
  const top = Math.round(band.top * scale);
  const cropped = Math.min(Math.round(band.height * scale), height - top);

  const buffer = await sharp(file)
    .extract({ left: 0, top, width, height: cropped })
    .png()
    .toBuffer();
  writeFileSync(file, buffer);
}

/** How a composed half is framed: label above, hairline box around. */
const FRAME = {
  pad: 28,
  gutter: 48,
  border: 2,
  labelGap: 14,
  borderColor: '#c7c7cc',
  labelColor: '#3c3c43',
  background: '#ffffff',
};

const PLATFORM_LABELS: Record<Platform, string> = { ios: 'iOS', android: 'Android' };

/**
 * Stitches the halves of a comparison shot into one image.
 *
 * They are first brought to a common size across the stacking axis: the same
 * height when side by side, the same width when stacked. A point and a
 * density-independent pixel are near enough the same physical size that the
 * same band on each platform is the same slice of screen, so matching them is
 * what puts the two UIs at comparable scale rather than distorting them. The
 * smaller of the two wins, since downscaling the denser screenshot is kinder
 * than upscaling the other into blur.
 *
 * Each half is then labelled and boxed. Two screenshots of mostly white UI
 * laid side by side bleed into each other: there is nothing to say where one
 * screen stops and the other starts, or which platform is which. The box is a
 * hairline rather than a phone bezel on purpose, because most of these are a
 * band cropped out of a screen and a bezel would claim they are whole phones.
 */
async function composeParts(
  parts: string[],
  out: string,
  axis: 'row' | 'column',
  labels: string[]
): Promise<void> {
  const sizes = await Promise.all(parts.map((part) => sharp(part).metadata()));
  const row = axis === 'row';
  const common = Math.min(...sizes.map((size) => (row ? (size.height ?? 0) : (size.width ?? 0))));

  const scaled = await Promise.all(
    parts.map(async (part, i) => {
      const width = sizes[i].width ?? 0;
      const height = sizes[i].height ?? 1;
      const size = row
        ? { width: Math.round((width * common) / height), height: common }
        : { width: common, height: Math.round((height * common) / width) };
      return {
        ...size,
        buffer: await sharp(part).resize(size.width, size.height).png().toBuffer(),
      };
    })
  );

  const fontSize = Math.min(
    48,
    Math.max(20, Math.round(Math.max(...scaled.map((s) => s.width)) * 0.035))
  );
  const labelHeight = Math.round(fontSize * 1.25);
  const cellTop = FRAME.pad + labelHeight + FRAME.labelGap;

  const layers: OverlayOptions[] = [];
  const boxes: string[] = [];
  let offset = FRAME.pad;
  let right = 0;
  let bottom = 0;

  scaled.forEach((piece, i) => {
    const left = row ? offset : FRAME.pad;
    const top = row ? cellTop : offset + labelHeight + FRAME.labelGap;
    layers.push({ input: piece.buffer, left: left + FRAME.border, top: top + FRAME.border });

    boxes.push(
      `<rect x="${left + FRAME.border / 2}" y="${top + FRAME.border / 2}" ` +
        `width="${piece.width + FRAME.border}" height="${piece.height + FRAME.border}" ` +
        `fill="none" stroke="${FRAME.borderColor}" stroke-width="${FRAME.border}" shape-rendering="crispEdges"/>`,
      `<text x="${left + (piece.width + FRAME.border * 2) / 2}" y="${top - FRAME.labelGap}" ` +
        `font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="${fontSize}" ` +
        `font-weight="600" fill="${FRAME.labelColor}" text-anchor="middle">${labels[i]}</text>`
    );

    // The canvas is sized from where things actually landed rather than from
    // a running total, which is easy to get wrong by one label's height.
    right = Math.max(right, left + piece.width + FRAME.border * 2);
    bottom = Math.max(bottom, top + piece.height + FRAME.border * 2);

    offset = row
      ? left + piece.width + FRAME.border * 2 + FRAME.gutter
      : top + piece.height + FRAME.border * 2 + FRAME.gutter;
  });

  const width = right + FRAME.pad;
  const height = bottom + FRAME.pad;

  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${boxes.join('')}</svg>`
  );

  await sharp({ create: { width, height, channels: 3, background: FRAME.background } })
    .composite([...layers, { input: svg, left: 0, top: 0 }])
    .png({ palette: true })
    .toFile(out);
}

async function shrink(file: string, maxWidth: number): Promise<void> {
  const { width } = await sharp(file).metadata();
  if (!width || width <= maxWidth) return;
  const buffer = await sharp(file).resize({ width: maxWidth }).png({ palette: true }).toBuffer();
  writeFileSync(file, buffer);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const shots: Shot[] = JSON.parse(readFileSync(join(SHOTS_DIR, 'shots.json'), 'utf8'));
  const wanted = options.only ? shots.filter((shot) => shot.id === options.only) : shots;
  if (!wanted.length) throw new Error(`No shot named ${options.only} in scripts/shots/shots.json`);

  const projectDir = ensureProject(options);
  ensureProjectNeeds(projectDir, wanted);
  mkdirSync(options.out, { recursive: true });
  mkdirSync(PARTS_DIR, { recursive: true });
  const written: string[] = [];

  for (const platform of options.platforms) {
    const forPlatform = wanted.filter((shot) => shot.platforms.includes(platform));
    if (!forPlatform.length) continue;

    const device = resolveDevice(platform, options);

    for (const theme of options.themes) {
      prepareDevice(platform, device, theme);

      for (const shot of forPlatform) {
        const themes = shot.themes ?? options.themes;
        if (!themes.includes(theme)) continue;

        const settle = shot.settle ?? 600;
        const code = readFileSync(join(SHOTS_DIR, `${shot.id}.js`), 'utf8');
        writeFileSync(join(projectDir, 'Resources', 'app.js'), preamble(shot.id, settle) + code);

        const suffix = options.themes.length > 1 ? `-${theme}` : '';
        const name = `${shot.id}-${platform}${suffix}.png`;
        const compose = shot.compose && !options.full;
        const file = compose ? join(PARTS_DIR, name) : join(options.out, name);
        console.log(`Building ${shot.id} for ${platform} (${theme})`);

        const ready = await buildAndWait(platform, device, projectDir, options, shot.id);
        if (platform === 'android') await stageAndroid(device, shot);
        capture(platform, device, file);
        if (!options.full) await cropBand(file, shot, ready, platform);
        if (!compose && shot.maxWidth && !options.full) await shrink(file, shot.maxWidth);
        if (!compose) written.push(file);
        console.log(`  ${file}`);
      }

      releaseDevice(platform, device);
    }
  }

  // Composing is its own pass: both halves have to exist, and one of them may
  // have been shot by an earlier run against the other platform.
  for (const shot of wanted) {
    if (!shot.compose || options.full) continue;
    for (const theme of options.themes) {
      const suffix = options.themes.length > 1 ? `-${theme}` : '';
      const parts = shot.compose.map((platform) =>
        join(PARTS_DIR, `${shot.id}-${platform}${suffix}.png`)
      );
      const missing = parts.filter((part) => !existsSync(part));
      if (missing.length) {
        console.log(`Not composing ${shot.id}${suffix}: no ${shot.compose.join(' or ')} half yet`);
        continue;
      }
      const out = join(options.out, `${shot.id}${suffix}.png`);
      const labels = shot.compose.map((platform) => PLATFORM_LABELS[platform]);
      await composeParts(parts, out, shot.composeAxis ?? 'row', labels);
      if (shot.maxWidth) await shrink(out, shot.maxWidth);
      written.push(out);
      console.log(`  ${out}`);
    }
  }

  console.log(`\n${written.length} image${written.length === 1 ? '' : 's'} written.`);
  if (!options.keep) {
    console.log(
      `Harness project left at ${projectDir} for the next run. Delete it to start clean.`
    );
  }
}

await main();
