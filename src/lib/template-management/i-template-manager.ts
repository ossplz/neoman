import { IEventEmitter } from '../emitters/i';
import { TemplateSearchEmitterType } from '../emitters';
import { TemplateManagerError } from './template-manager-error';
import { ITemplate } from '../i';

export interface ITemplateManager {
    list(
        end?: (templates: ITemplate[]) => void,
        error?: (terror: TemplateManagerError) => void,
        match?: (tmpl: ITemplate) => void
    ): IEventEmitter<TemplateSearchEmitterType>;
    
    info(tmplId: string): Promise<ITemplate>;
}