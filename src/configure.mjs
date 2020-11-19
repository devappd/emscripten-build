import Bootstrap from './bootstrap.mjs';
import emsdk from 'emsdk-npm';
import { checkMakeInstalled, makeCommand } from './environment.mjs';

export default class Configure extends Bootstrap {
  constructor(configDir, makeDir, cleanDirs = null, options = null) {
    // three-args: (configDir, cleanDirs, options)
    if (options === null) {
      // two-args: (configDir, options)
      if (cleanDirs === null) {
        options = makeDir;
        makeDir = configDir;
      } else {
        // three-args
        options = cleanDirs;
        cleanDirs = makeDir;
        makeDir = configDir;
      }
    }

    super(configDir, makeDir, cleanDirs, options);

    this.configCommand = 'emconfigure';
    this.configSubCommand = 'configure';

    this.makeCommand = 'emmake';
    this.makeSubCommand = makeCommand;
  }

  async __ensureConfigure() {
    try {
      await fs.lstat(path.join(this.makeDir, "Makefile"));
    }
    catch (e) {
      await this.__configure();
    }
  }

  async __bindCommand(ctx, impl, ...args) {
    // Throws error if Make is not installed.
    await checkMakeInstalled();
    this.makeSubCommand = makeCommand;
    return super._bindCommand(ctx, impl, ...args);
  }

////////////////////////////////////////////////////////////////////////
// Implementations
////////////////////////////////////////////////////////////////////////

  async __configure(options) {
    options = this._processOptions(options);

    await emsdk.run(this.configCommand,
      [this.configSubCommand, ...options],
      {cwd: this.configDir, shell: (process.platform === 'win32')}
    );
  }

  async __build(target, options) {
    // one-arg: (options)
    if (target instanceof Object) {
      options = target;
      target = null;
    }

    // Make sure everything's configured before building
    await this.__ensureConfigure();

    // make options are not the same as configure options,
    // so do not default to those.
    options = options ? this._processOptions(options) : [];

    // build args
    let args;
    if (target)
      args = [this.makeSubCommand, target, ...options];
    else
      args = [this.makeSubCommand, ...options];

    await emsdk.run(this.makeCommand, args,
      {cwd: this.makeDir, shell: (process.platform === 'win32')}
    );
  }

  async __reconfigure(options) {
    // Process options here so we can replace the
    // default ones.
    options = this._processOptions(options);
    await this.clean();
    await this.__configure(options);
    this.args = options;
  }

  async __rebuild(target, makeOptions) {
    await this.clean();
    await this.__build(target, makeOptions);
  }

  async __compile(target, makeOptions) {
    try {
      await this.__build(target, makeOptions);
    }
    catch (e) {
      console.log("Build has been failed, trying to do a full rebuild.");
      await this.__rebuild(target, makeOptions);
    }
  }

////////////////////////////////////////////////////////////////////////
// Bindings
////////////////////////////////////////////////////////////////////////

  async configure(options) {
    // Use this._bindCommand() because we are not checking
    // for make command here.
    return this._bindCommand(this, this.__configure, options);
  }

  async build(target, options) {
    return this.__bindCommand(this, this.__build, target, options);
  }

  async reconfigure(options) {
    // Use this._bindCommand() because we are not checking
    // for make command here.
    return this._bindCommand(this, this.__reconfigure, options);
  }

  async rebuild(target, makeOptions) {
    return this.__bindCommand(this, this.__rebuild, target, makeOptions);
  }

  async compile(target, makeOptions) {
    return this.__bindCommand(this, this.__compile, target, makeOptions);
  }
}
