export default interface IUserEntity {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  gender: string;
  birthday: string;
  family_id: string;
}
