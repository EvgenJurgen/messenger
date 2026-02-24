import { IsEmail, IsString, MinLength } from 'class-validator';

/** Validation messages use i18n keys; the exception filter maps them to English text. */
export class LoginDtoClass {
  @IsEmail({}, { message: 'errors.invalid_email' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'errors.password_required' })
  password!: string;
}
