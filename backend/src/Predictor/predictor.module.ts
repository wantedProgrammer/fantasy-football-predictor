import { Module } from '@nestjs/common';

import { PlayersModule } from '../Players/players.module';
import { PredictorResolver } from './predictor.resolver';
import { PredictorService } from './predictor.service';

@Module({
  imports: [PlayersModule],
  providers: [PredictorResolver, PredictorService],
})
export class PredictorModule {}
