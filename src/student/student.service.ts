import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { StudentEntity } from './student.entity';
import {
  StudentProfileResponse,
  studentStatus,
  UpdatedStudentResponse,
} from '../interfaces/StudentInterface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../project/project.entity';
import { UpdateStudentDetailsDto } from './dto/update-student-details.dto';
import { projectTypeEnum } from '../interfaces/ProjectInterface';
import { StudentListQueryRequestInterface } from '../interfaces/StudentListFilterInterface';
import { roleEnum } from 'src/interfaces/UserInterface';
import { StudentListResponse } from 'src/interfaces/StudentListResponse';
import { ProjectService } from '../project/project.service';
import { UserService } from '../user/user.service';
import { listSortDispatchColumn } from 'src/utils/columnDispatcher';
import { StudentListConversationResponse } from 'src/interfaces/StudentListConversationResponse';
import { ConversationListRequestInterface } from 'src/interfaces/ConversationListRequestInterface';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(StudentEntity)
    private studentRepository: Repository<StudentEntity>,
    @Inject(ProjectService)
    private projectService: ProjectService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async create(userId): Promise<StudentEntity> {
    try {
      return await this.studentRepository.save({
        userId,
        status: studentStatus.available,
      });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async findConversationOnly(
    filterParams: ConversationListRequestInterface,
    UserHrID: string,
  ): Promise<[StudentListConversationResponse[], number]> {
    const query = await this.studentRepository
      .createQueryBuilder('student')
      .leftJoin('student.user', 'user')
      .leftJoin('student.conversation', 'conversation')
      .select([
        'user.id AS userId',
        'CONCAT(student.firstName, " ", student.lastName) AS fullName',
        'DATE_SUB(conversation.createdAt, INTERVAL 10 DAY) AS expireIn',
        'student.githubName AS GithubUserName',
      ])
      .where('conversation.hrProfile = :val', { val: UserHrID })
      .where('"fullName" LIKE :val', { val: `%${filterParams.srch || ''}%` });

    const result = await query.getRawMany();
    const count = await query.getCount();
    return [result, count];
  }

  async findAll(
    filterParams: StudentListQueryRequestInterface,
  ): Promise<[StudentListResponse[], number]> {
    try {
      const limit = (filterParams.pitems <= 90 && filterParams.pitems) || 15;
      const offset = (filterParams.page ?? 1) * limit - limit ?? 1;

      const query = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.user', 'user')
        .leftJoinAndSelect('user.projectEvaluation', 'evaluation')
        .select([
          'user.id AS userId',
          'student.firstName AS firstName',
          'student.lastName AS lastName',
          'student.expectedWorkType AS expectedWorkType',
          'student.targetWorkCity AS targetWorkCity',
          'student.expectedContractType AS expectedContractType',
          'student.expectedSalary AS expectedSalary',
          'student.canTakeApprenticeship AS canTakeApprenticeship',
          'student.monthsOfCommercialExperience AS monthsOfCommercialExperience',
          // 'user.role AS role', // Uncomment to debug role type
          'evaluation.projectDegree AS projectDegree',
          'evaluation.teamProjectDegree AS teamProjectDegree',
          'evaluation.courseCompletion AS courseCompletion',
          'evaluation.courseEngagement AS courseEngagemnet',
        ])
        .where(`user.role = ${roleEnum.student}`)
        .andWhere('user.isActive = 1');

      // if (conversationOnly) {
      //   query
      //     .andWhere('conversation.hrProfileId = :userId', {
      //       userId: userId,
      //     })
      //     .andWhere('student.status = :status', {
      //       status: studentStatus.duringConversation,
      //     });
      // } else {
      //   query.andWhere('student.status = :val', {
      //     val: studentStatus.available,
      //   });
      // }

      if (filterParams?.pd) {
        query.andWhere('evaluation.projectDegree >= :val', {
          val: filterParams.pd,
        });
      }

      if (filterParams?.cc) {
        query.andWhere('evaluation.courseCompletion >= :val', {
          val: filterParams.cc,
        });
      }

      if (filterParams?.ce)
        query.andWhere('evaluation.courseEngagement >= :val', {
          val: filterParams.ce,
        });

      if (filterParams?.tpd)
        query.andWhere('evaluation.teamProjectDegree >= :val', {
          val: filterParams.tpd,
        });

      if (filterParams?.es)
        query.andWhere(
          'student.expectedSalary BETWEEN :lowerMargin AND :upperMargin',
          {
            lowerMargin: filterParams.es[0] || 0,
            upperMargin: filterParams.es[1] || 100000000,
          },
        );

      if (filterParams?.cta)
        query.andWhere('student.canTakeApprenticeship = :val', {
          val: filterParams.cta,
        });

      if (filterParams?.ect)
        query.andWhere('student.expectedContractType IN (:val)', {
          val: filterParams.ect,
        });

      if (filterParams?.ewt)
        query.andWhere('student.expectedContractType IN (:val)', {
          val: filterParams.ewt,
        });

      if (filterParams?.moce)
        query.andWhere('student.monthsOfCommercialExperience >= :val', {
          val: filterParams.moce,
        });

      if (filterParams?.srch)
        query.andWhere('student.targetWorkCity LIKE :val', {
          val: `%${filterParams.srch}%`,
        });

      query.orderBy(
        listSortDispatchColumn(filterParams.ord),
        filterParams.asc ? 'ASC' : 'DESC',
      );

      return [
        await query.limit(limit).offset(offset).getRawMany(),
        await query.getCount(),
      ];
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException();
    }
  }

  async findOne(userId: string): Promise<StudentProfileResponse> {
    try {
      const student = await this.studentRepository
        .createQueryBuilder('student')
        .leftJoin('student.user', 'user')
        .leftJoinAndMapMany(
          'student.bonusProjects',
          ProjectEntity,
          'bonusProject',
          'bonusProject.user_id = :userId AND bonusProject.type = :typeB',
          { typeB: projectTypeEnum.bonusProject },
        )
        .leftJoinAndMapMany(
          'student.portfolioProjects',
          ProjectEntity,
          'portfolioProject',
          'portfolioProject.user_id = :userId AND portfolioProject.type = :typeP',
          { typeP: projectTypeEnum.portfolio },
        )
        .select([
          'user.email',
          'student.phoneNumber',
          'student.firstName',
          'student.lastName',
          'student.githubName',
          'student.bio',
          'student.expectedWorkType',
          'student.targetWorkCity',
          'student.expectedContractType',
          'student.expectedSalary',
          'student.canTakeApprenticeship',
          'student.monthsOfCommercialExperience',
          'student.education',
          'student.workExperience',
          'student.courses',
          'GROUP_CONCAT(DISTINCT bonusProject.url) AS bonusProjectUrls',
          'GROUP_CONCAT(DISTINCT portfolioProject.url) AS portfolioUrls',
        ])
        .where('student.user_id = :userId', { userId })
        .groupBy('user.id')
        .getRawOne();
      console.log(student);

      return {
        studentDetails: student,
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException();
    }
  }

  async findStudentByUserId(id: string): Promise<StudentEntity> {
    try {
      return await this.studentRepository.findOne({ where: { userId: id } });
    } catch {
      throw new InternalServerErrorException();
    }
  }

  async updateOne(
    student: StudentEntity,
    studentProfileDetails: UpdateStudentDetailsDto,
  ): Promise<UpdatedStudentResponse> {
    try {
      const {
        email,
        bonusProjectUrl,
        portfolioUrl,
        githubName,
        ...restOfDetails
      } = studentProfileDetails;

      const updates = [];

      if (
        !Object.values({ ...restOfDetails, githubName }).every(
          (detail) => detail === undefined,
        )
      ) {
        updates.push(
          this.studentRepository
            .createQueryBuilder()
            .update('students')
            .set({
              githubName,
              ...restOfDetails,
              updatedAt: () => 'CURRENT_TIMESTAMP',
            })
            .where('id = :id', { id: student.id })
            .execute(),
        );
      }

      if (email) {
        updates.push(this.userService.updateUserEmail(student.userId, email));
      }

      if (bonusProjectUrl) {
        updates.push(
          this.projectService.updateProject(
            student.userId,
            bonusProjectUrl,
            projectTypeEnum.bonusProject,
          ),
        );
      }

      if (portfolioUrl) {
        updates.push(
          this.projectService.updateProject(
            student.userId,
            portfolioUrl,
            projectTypeEnum.portfolio,
          ),
        );
      }

      const updateResults = await Promise.all(updates);

      const isSuccess = updateResults.some((el) => el.affected > 0);

      return {
        isSuccess,
        message: isSuccess
          ? 'All affected records have been successfully updated'
          : 'No records affected',
      };
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException();
    }
  }
}
