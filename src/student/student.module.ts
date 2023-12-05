import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentEntity } from './student.entity';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { UserModule } from '../user/user.module';
import { HttpModule } from '@nestjs/axios';
import { ProjectEntity } from '../project/project.entity';
import { GithubNameValidator } from '../utils/githubNameValidator';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentEntity]),
    TypeOrmModule.forFeature([ProjectEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => HttpModule),
  ],
  controllers: [StudentController],
  providers: [StudentService, GithubNameValidator],
  exports: [StudentService],
})
export class StudentModule {}
