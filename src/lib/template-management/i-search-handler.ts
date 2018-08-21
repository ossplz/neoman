import { ITemplate } from "../i";
import { TemplateSearchEmitterType, EventEmitter } from "../emitters";

export interface ISearchHandler {
    endList(templatesRef: ITemplate[], emitter: EventEmitter<TemplateSearchEmitterType>, path: string): void;
    
    templateMatch(emitter: EventEmitter<TemplateSearchEmitterType>, tmplDir: string, file: string): void;
}