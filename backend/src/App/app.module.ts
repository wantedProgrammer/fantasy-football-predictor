import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PlayersModule } from '../Players/players.module';
import { PredictorModule } from '../Predictor/predictor.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: true,
    }),

    PlayersModule,
    PredictorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}