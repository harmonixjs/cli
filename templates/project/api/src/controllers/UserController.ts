import { Controller, Get, Params, Query, Inject } from '@harmonixjs/express';
import { Harmonix } from '@harmonixjs/core';

@Controller({ path: '/users' })
export class UserController {

  @Inject('bot') bot: Harmonix;

  @Get('/:id')
  async getUser(@Params('id') id: string) {
    const user = await this.bot.users.fetch(id);
    return user ? { id: user.id, username: user.username } : { error: 'User not found' };
  }

  @Get('/search')
  async search(@Query('q') query: string) {
    const results = this.bot.users.cache.filter(u =>
      u.username.toLowerCase().includes(query.toLowerCase())
    );

    return results.map(u => ({
      id: u.id,
      username: u.username,
      tag: u.tag
    }));
  }
}