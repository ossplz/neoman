import { injectable, inject } from 'inversify';
import * as _ from 'underscore';
let requireg = require('requireg');

import TYPES from '../di/types';
import * as i from './i';
import * as ir from '../i/template';
import * as bi from '../i';
import { TemplateConfiguration } from './models/configuration';

@injectable()
export class BaseTransformManager {
    protected splitter: RegExp = new RegExp(/^\/(.*(?!\\))\/(.*)\/([gimuy]*)$/).compile();

    protected configs: { [key: string]: TemplateConfiguration };
    protected inputs: { [key: string]: any };

    constructor(
        @inject(TYPES.FilePatterns) protected filePatterns: bi.IFilePatterns,
        @inject(TYPES.UserMessager) protected msg: bi.IUserMessager
    ) {
        
    }

    preparePlugins(tconfigs: ir.IConfigurations): void {
        this.configs = {};
        for (let key in tconfigs) {
            let tconfig = tconfigs[key];
            let config = new TemplateConfiguration();
            config.key = key;
            config.files = tconfig.files;
            config.ignore = tconfig.ignore;
            config.plugin = tconfig.plugin;
            config.parserOptions = tconfig.parserOptions;
            let PluginClass = requireg(`neoman-plugin-${config.plugin}`);
            config.pluginInstance = new PluginClass();
            config.pluginInstance.configure(config.parserOptions);
            this.configs[key] = config;
        }
    }

    isComment(s: string): boolean {
        return s && s[0] === '#';
    }
    
    applyReplace(original: string, tdef: ir.ITransform | ir.IPathTransform, path: string):  string {
        // Minimally, we want fast, internal regex replacement. It should be overridable within the configurations section of a template.json.
        let engine = this.chooseReplaceEngine(tdef);

        // Be wary when trying to reduce the redundant rdef.with checks; it's been tried! Type soup.
        switch(engine) {
            case "regex":
                if (typeof tdef.with === "string")
                    return original.replace(new RegExp(<string>tdef.subject, tdef.regexFlags || ""), this.preprocess(tdef.with));
                else
                    return original.replace(new RegExp(<string>tdef.subject, tdef.regexFlags || ""), this.buildReplacer(tdef));
            case "simple":
                if (typeof tdef.with === "string")
                    return original.split(<string>tdef.subject).join(this.preprocess(tdef.with));
                else
                    return original.split(<string>tdef.subject).join(this.buildReplacer(tdef)(<string>tdef.subject));
            case "plugin":
                try {
                    let config = this.configs[tdef.configuration];
                    if (typeof tdef.with === "string") {
                        return config.pluginInstance.transform(path, original, tdef.subject, this.preprocess(tdef.with), _.extend({}, config.parserOptions, tdef.params));
                    } else {
                        return config.pluginInstance.transform(path, original, tdef.subject, this.buildReplacer(tdef), _.extend({}, config.parserOptions, tdef.params));
                    }
                } catch (err) {
                    this.msg.error(`Error running plugin from "${tdef.configuration}" configuration:`, 3);
                    this.msg.error(err.toString(), 3);
                    return original;
                }
            default:
                throw new Error(`Unimplemented transform engine ${engine}.`);
        }
    }

    chooseReplaceEngine(tdef: ir.ITransform | ir.IPathTransform) {
        if (! tdef.configuration || tdef.configuration === "regex") {
            if (this.configs.hasOwnProperty("regex")) // Then, the user wants to override the default.
                return "plugin";
            
            return "regex";
        } else if (tdef.configuration === "simple") {
            if (this.configs.hasOwnProperty("simple"))
                return "plugin";

            return "simple";
        }

        return "plugin";
    }

    buildReplacer(tdef: ir.ITransform): (substr: string) => string {
        //TODO FIXME not truly implemented
        if (typeof tdef.with === 'object' && tdef.with.handler)
        {
            return (substr: string) => substr;
        }

        throw new Error(`Handler definition missing for replace '${tdef.subject}'.`);
    }

    private varMatcher = /{{[^}]*}}/g;
    preprocess(withDef: string): string {
        let result = withDef.replace(this.varMatcher, (match) => {
            return this.inputs[match.substr(2, match.length-4)] /* found it? */
                || (match === "{{{{}}" ? "{{" /* is an escape */ : match /* nope, return same */)
        });
        return result;
    }

    /**
     * Determines whether a config definition, and a set of include/ignore globs apply to a given path.
     * Co-recursive with configDoesApply.
     * @param path The path against which to compare globs.
     * @param files A list of include globs. Files in this list will be included unless explicitly ignored.
     * @param ignore A list of ignore globs. Overrides matches from the files parameter.
     * @param configKey A configuration definition to match (itself containing include/ignore globs).
     */
    replaceDoesApply(path: string, files: string[], ignore: string[], configKey: string): boolean {
        if (typeof files === "undefined" && typeof ignore === "undefined" && typeof configKey === "undefined")
            return true; // No explicit inclusions or exclusions --> Global replace.
        
        let configMatches = configKey ? this.configDoesApply(path, configKey) : true;
        let filesMatch = (files && (files instanceof Array) && files.length) ? this.filePatterns.match(path, files) : [];
        let ignoresMatch = (ignore && (ignore instanceof Array) && ignore.length) ? this.filePatterns.match(path, ignore) : [];
        //console.log(configMatches, filesMatch, ignoresMatch);
        //console.log(configMatches, files, path, filesMatch, ignoresMatch);
        if (typeof files === "undefined" && (typeof ignore !== "undefined" && ! ignoresMatch.length))
            return configMatches; // Files undefined, ignores defined, but no ignore matches. Global replace if config matches.

        return (configMatches && (!files || !files.length || filesMatch.length) && !ignoresMatch.length);
    }

    /**
     * Determines whether a config definition applies to a given path.
     * Co-recursive with replaceDoesApply.
     * @param path The path against which to check the config definition.
     * @param configKey The key of the config containing include/ignore globs to lookup.
     */
    configDoesApply(path: string, configKey: string): boolean {
        if (this.configs.hasOwnProperty(configKey)) {
            let c = this.configs[configKey];
            return this.replaceDoesApply(path, c.files, c.ignore, undefined);
        } else {
            throw new Error(`Configuration key "${configKey}" does not exist.`);
        }
    }
}