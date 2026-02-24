import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Validation messages use i18n keys; the exception filter maps them to English text. */
export class RegisterDtoClass {
  @IsEmail({}, { message: 'errors.invalid_email' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'errors.nickname_min_length' })
  @MaxLength(64, { message: 'errors.nickname_max_length' })
  nickname!: string;

  @IsString()
  @MinLength(8, { message: 'errors.password_min_length' })
  @MaxLength(64, { message: 'errors.password_max_length' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'errors.password_format',
  })
  password!: string;
}
