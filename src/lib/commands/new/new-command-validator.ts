import { Command } from "commandpost";

import { INewCmdArgs, INewCmdOpts, ICommand, ICommandValidator } from "../i";
import { Commands } from '../commands';
import { CommandValidationResult, CommandErrorType } from '../../models';
import { BaseCommandValidator } from "../base-command-validator";
import { inject } from "inversify";
import { IUserMessager, ISettingsProvider } from "../../i";
import TYPES from "../../di/types";
import { ValidatorOptions } from "../validator-options";

export class NewCommandValidator extends BaseCommandValidator<INewCmdOpts, INewCmdArgs> {
    constructor(
        @inject(TYPES.UserMessager) protected msg: IUserMessager,
        @inject(TYPES.SettingsProvider) protected settings: ISettingsProvider
    ) {
        super(msg, settings, { checkTmplId: true });
    }
}