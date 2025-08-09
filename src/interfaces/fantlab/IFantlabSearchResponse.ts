import { FantlabSearchTypeEnum } from "./../../enums/fantlabSearchTypeEnum";
import { IFantlabAuthor } from "./IFantlabAuthor";
import { IFantlabEdition } from "./IFantlabEdition";
import { IFantlabWork } from "./IFantlabWork";

export interface IFantlabSearchResponse<T extends FantlabSearchTypeEnum> {
  type: T;
  matches: T extends FantlabSearchTypeEnum.AUTHORS
    ? IFantlabAuthor[]
    : T extends FantlabSearchTypeEnum.WORKS
    ? IFantlabWork[]
    : T extends FantlabSearchTypeEnum.EDITIONS
    ? IFantlabEdition[]
    : any;
}
