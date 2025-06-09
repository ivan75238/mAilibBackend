export default interface IUserDto {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  hash?: string;
  email: string;
  verified: boolean;
  gender: string;
  birthday: string;
  code?: string;
}
