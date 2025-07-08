import IUserEntity from "./IUserEntity";

export default interface IFamilyEntity {
  id: string;
  leader_id: string;
  users: IUserEntity[];
}
