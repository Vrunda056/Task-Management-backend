import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)      // Set the HTTP status code to 204 No Content
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}

  // @HttpCode(HttpStatus.NO_CONTENT) overrides default 200 to 204
   
  //  WHY 204 (NO_CONTENT)?
  //  - 200 OK         : Means "Deleted, and here is a response body (e.g. { success: true })"
  //  - 204 No Content : The standard REST convention when an action succeeds and 
  //                     intentionally sends back NO response body (saves network payload)