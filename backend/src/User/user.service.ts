import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    return user;
  }

  async findByMobile(mobile: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { mobile },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    await this.findOne(id);
    await this.userRepository.update(id, data);
    return this.findOne(id);
  }

  async setFavouritePlayer(
    userId: number,
    player: string,
  ): Promise<User> {
    const user = await this.findOne(userId);

    user.favouritePlayer = player;

    user.auditLogs = [
      ...(user.auditLogs ?? []),
      {
        action: 'SET_FAVOURITE_PLAYER',
        timestamp: new Date().toISOString(),
        details: `Favourite player changed to ${player}`,
      },
    ];

    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.userRepository.delete(id);
  }
}