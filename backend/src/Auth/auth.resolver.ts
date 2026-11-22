import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { GqlAuthGuard } from './gql-auth.guard';

import { RegisterInput } from './dto/register.input';
import { LoginInput } from './dto/login.input';

import { UserModel } from '../User/user.model';
import { LoginResponse } from './models/login-response.model';

type AuthenticatedUser = {
  userId: number;
  email: string;
  mobile: string;
};

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query(() => String)
  health(): string {
    return 'Fantasy Predictor API is running!';
  }

  @Mutation(() => UserModel)
  register(
    @Args('input') input: RegisterInput,
  ): Promise<UserModel> {
    return this.authService.register(input);
  }

  @Mutation(() => LoginResponse)
  login(
    @Args('input') input: LoginInput,
  ): Promise<LoginResponse> {
    return this.authService.login(input);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => UserModel)
  me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserModel> {
    return this.authService.me(user.userId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserModel)
  setFavouritePlayer(
    @Args('player') player: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UserModel> {
    return this.authService.setFavouritePlayer(
      user.userId,
      player,
    );
  }
}