const path = require("path");
const utility = require('utility');
const fs = require("fs");
const isFunction = require('is-type-of').function;
const log = console.log;

const toUpper = toCase("toUpperCase");
const toLower = toCase("toLowerCase")
function toCase(cas) {
    return function (str, at = str.length) {
        return str.substring(0, at)[cas]() + str.substring(at);
    }
}

function loadFile(filepath) {
    // require js module
    const obj = require(filepath);
    if (!obj) return obj;
    // it's es module
    if (obj.__esModule) return 'default' in obj ? obj.default : obj;
    return obj;
}


class RelyLoader {
    constructor(loader, frameworkPaths) {
        this.loader = loader;
        this.frameworkPaths = frameworkPaths;
        this.baseDir = loader.options.baseDir;
        this.app = loader.options.app;

        this.framewordConfigs = frameworkPaths.map(frameworkPath => {
            return this.loadFramewordConfig(frameworkPath)
        });
        log(this.framewordConfigs);
    }
    loadFramewordConfig(frameworkPath) {
        const framewordConfig = {
            path: frameworkPath
        }
        //读取framework package.json
        const pkg = utility.readJSONSync(path.join(frameworkPath, 'package.json'));
        //读取frameword的plugin
        const pluginConfig = this.loadPlugin(frameworkPath);

        const unit = this.loadUnit(frameworkPath);
        Object.assign(framewordConfig, unit, {
            name: pkg.name,
            plugin: pluginConfig
        });
        return framewordConfig;
    }
    loadPlugin(frameworkPath) {
        const pluginPath = path.join(frameworkPath, 'config/plugin.default.js');
        const pluginConfigs = this.loader.readPluginConfigs(pluginPath);
        Object.values(pluginConfigs).forEach(pluginConfig => {
            const pth = this.loader.getPluginPath(pluginConfig, this.baseDir);
            const unit = this.loadUnit(pth);
            Object.assign(pluginConfig, unit, {
                path: pth
            });
        });
        return pluginConfigs;
    }
    loadUnit(pth) {
        const service = this.loadService(pth);
        const config = this.loadConfig(pth);
        const extend = this.loadExtend(pth);
        const middleware = this.loadMiddleware(pth);
        return {
            service, config, extend, middleware
        }
    }
    loadService(pth) {
        const directory = path.join(pth, 'app/service');
        const arr = [];
        this.bfs(directory, fpath => {
            const info = this.getBaseInfoByPath(fpath);
            const target = loadFile(info.path);
            const service = new target(this.app);

            Object.assign(info, {
                target: service
            });

            arr.push(info);
        });
        return arr;
    }
    loadConfig(pth) {
        const directory = path.join(pth, 'config');
        const arr = [];
        this.bfs(directory, fpath => {
            const info = this.getBaseInfoByPath(fpath);
            if (!(/plugin(\.\w*)?\.js/.test(info.base))) {
                const target = loadFile(info.path);

                Object.assign(info, {
                    target: isFunction(target) ? target(this.loader.appInfo) : target
                });

                arr.push(info);
            }
        });
        return arr;
    }
    loadExtend(pth) {
        const directory = path.join(pth, 'app/extend');
        const arr = [];
        this.bfs(directory, fpath => {
            const info = this.getBaseInfoByPath(fpath);

            const target = loadFile(info.path);

            Object.assign(info, {
                extend: toUpper(info.name, 1),
                target: target
            });

            arr.push(info);
        });
        return arr;
    }
    loadMiddleware(pth) {
        const directory = path.join(pth, 'app/middleware');
        const arr = [];
        this.bfs(directory, fpath => {
            arr.push(file);
        });
        return arr;
    }
    getBaseInfoByPath(fpath) {
        const parse = path.parse(fpath);
        return Object.assign({
            path: fpath,
        }, parse)
    }
    bfs(pth, operate) {
        const dirs = [];
        let files = null;
        try {
            files = fs.readdirSync(pth);
        } catch (err) {
            return;
        }
        files.forEach(file => {
            const pfile = path.join(pth, file);
            const stats = fs.statSync(pfile);
            if (stats.isDirectory()) {
                dirs.push(pfile);
            } else if (stats.isFile() && path.extname(file) === '.js') {
                operate(pfile);
            }
        });
        dirs.forEach(dir => this.bfs(dir, operate));
    }
    dfs(pth, operate) {
        const files = null;
        try {
            files = fs.readdirSync(pth);
        } catch (err) {
            return;
        }
        files.forEach(file => {
            const stats = fs.statSync(file);
            if (stats.isDirectory()) {
                this.dfs(file, operate);
            } else if (stats.isFile()) {
                operate(file);
            }
        });
    }
}

class Rely {
    constructor(baseDir = process.cwd()) {
        const pkg = utility.readJSONSync(path.join(baseDir, 'package.json'));
        const dep = pkg.egg.framework;
        const Application = require(dep).Application;

        const app = this.app = new Application();
        const loader = this.loader = app.loader;

        const frameworkPaths = loader.eggPaths;
        frameworkPaths.push(baseDir);

        new RelyLoader(loader, frameworkPaths);
    }
}








new Rely();



