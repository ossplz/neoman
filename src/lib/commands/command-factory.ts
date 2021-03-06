import { injectable, multiInject, inject } from 'inversify';
import { Commands, COMMANDS } from './commands';
import { ICommandFactory, ICommand } from './i';
import { IUserMessager } from '../i';
import TYPES from '../di/types';
import { Command } from 'commandpost/lib';
import { curry } from '../util/curry';

@injectable()
export class CommandFactory implements ICommandFactory {
    private cmdDict: { [key: string]: ICommand<any, any> };

    constructor(
        @inject(TYPES.UserMessager) private msg: IUserMessager,
        @multiInject(TYPES.Commands) private commands: ICommand<any, any>[]
    ) {
        this.cmdDict = this.commands.reduce((p, c) => { p[c.type] = c; return p; }, {});
    }

    build<TOpts, TArgs>(type: Commands, tempDir: string, cmd: Command<TOpts, TArgs>): ICommand<any, any> {
        if (this.cmdDict.hasOwnProperty(type)) {
            const c = this.cmdDict[type];
            c.tempDir = tempDir;

            // bind action to command.run
            const boundFn = curry.oneOf3(c.run, c, cmd);
            cmd.action(boundFn);
            return c;
        }

        throw new Error(this.msg.mf('Command not implemented: {type}.', {type}));
    }
}