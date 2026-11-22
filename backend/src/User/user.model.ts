import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserModel {
  @Field(() => Int)
  id!: number;

  @Field()
  name!: string;

  @Field()
  surname!: string;

  @Field()
  email!: string;

  @Field()
  mobile!: string;

  @Field({ nullable: true })
  favouritePlayer?: string;
}
