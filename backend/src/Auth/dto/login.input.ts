import { Field, InputType } from '@nestjs/graphql';
import { Matches, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @Matches(/^0\d{9}$/, {
    message: 'Mobile number must be 10 digits and start with 0',
  })
  mobile!: string;

  @Field()
  @MinLength(6)
  @Matches(/^(?=.*[A-Z]).+$/, {
    message: 'Password must contain at least one uppercase letter',
  })
  password!: string;
}